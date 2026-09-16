import { readFileSync } from 'node:fs';

import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

const confirmation = process.env.CONFIRM_COPY_TEST_TO_PRODUCTION;

if (confirmation !== 'replace-production') {
	throw new Error(
		'Refusing to copy data without CONFIRM_COPY_TEST_TO_PRODUCTION=replace-production'
	);
}

const testEnv = dotenv.parse(readFileSync('.env.test'));
const productionEnv = dotenv.parse(readFileSync('.env.production'));

const testDatabaseUrl = testEnv.DATABASE_URL;
const productionDatabaseUrl = productionEnv.DATABASE_URL;

const e2eUserEmail = testEnv.E2E_TEST_EMAIL?.trim().toLowerCase();

if (!testDatabaseUrl) throw new Error('.env.test DATABASE_URL is not set');
if (!productionDatabaseUrl) throw new Error('.env.production DATABASE_URL is not set');
if (!e2eUserEmail) throw new Error('.env.test E2E_TEST_EMAIL is not set');
if (testDatabaseUrl === productionDatabaseUrl) {
	throw new Error('Refusing to copy data because test and production DATABASE_URL are identical');
}

const tables = [
	{
		name: 'user',
		orderBy: ['id'],
		columns: ['id', 'name', 'email', 'role', 'email_verified', 'image', 'created_at', 'updated_at'],
		casts: { role: 'user_role' }
	},
	{
		name: 'account',
		orderBy: ['id'],
		columns: [
			'id',
			'account_id',
			'provider_id',
			'user_id',
			'access_token',
			'refresh_token',
			'id_token',
			'access_token_expires_at',
			'refresh_token_expires_at',
			'scope',
			'password',
			'created_at',
			'updated_at'
		]
	},
	{
		name: 'team_members',
		orderBy: ['id'],
		columns: [
			'id',
			'name',
			'color',
			'created_by_user_id',
			'updated_by_user_id',
			'created_at',
			'updated_at'
		]
	},
	{
		name: 'shifts',
		orderBy: ['id'],
		columns: [
			'id',
			'team_member_id',
			'shift_date',
			'start_time',
			'end_time',
			'recurrence_frequency',
			'recurrence_until',
			'recurrence_days',
			'notes',
			'created_by_user_id',
			'updated_by_user_id',
			'created_at',
			'updated_at'
		],
		casts: { recurrence_frequency: 'recurrence_frequency' }
	},
	{
		name: 'shift_exceptions',
		orderBy: ['id'],
		columns: ['id', 'shift_id', 'occurrence_date', 'action', 'created_at', 'updated_at']
	}
];

const truncateTableNames = [
	'shift_exceptions',
	'shifts',
	'team_members',
	'session',
	'account',
	'user'
];

const serialTables = ['team_members', 'shifts', 'shift_exceptions'];
const chunkSize = 100;
const e2eTeamMemberPrefix = 'E2E ';

const quoteIdentifier = (identifier) => `"${identifier.replaceAll('"', '""')}"`;

const tableSql = (tableName) => quoteIdentifier(tableName);
const columnsSql = (columns) => columns.map(quoteIdentifier).join(', ');

const testDb = neon(testDatabaseUrl);
const productionDb = neon(productionDatabaseUrl);

const rowsByTable = new Map();

for (const table of tables) {
	const rows = await testDb.query(
		`select ${columnsSql(table.columns)} from ${tableSql(table.name)} order by ${columnsSql(
			table.orderBy
		)}`
	);
	rowsByTable.set(table.name, rows);
}

const excludedUserIds = new Set(
	rowsByTable
		.get('user')
		.filter((row) => row.email?.toLowerCase() === e2eUserEmail)
		.map((row) => row.id)
);
const excludedTeamMemberIds = new Set(
	rowsByTable
		.get('team_members')
		.filter((row) => row.name.startsWith(e2eTeamMemberPrefix))
		.map((row) => row.id)
);
const excludedShiftIds = new Set(
	rowsByTable
		.get('shifts')
		.filter((row) => excludedTeamMemberIds.has(row.team_member_id))
		.map((row) => row.id)
);

rowsByTable.set(
	'user',
	rowsByTable.get('user').filter((row) => !excludedUserIds.has(row.id))
);
rowsByTable.set(
	'account',
	rowsByTable.get('account').filter((row) => !excludedUserIds.has(row.user_id))
);
rowsByTable.set(
	'team_members',
	rowsByTable
		.get('team_members')
		.filter((row) => !excludedTeamMemberIds.has(row.id))
		.map((row) => ({
			...row,
			created_by_user_id: excludedUserIds.has(row.created_by_user_id)
				? null
				: row.created_by_user_id,
			updated_by_user_id: excludedUserIds.has(row.updated_by_user_id)
				? null
				: row.updated_by_user_id
		}))
);
rowsByTable.set(
	'shifts',
	rowsByTable
		.get('shifts')
		.filter((row) => !excludedShiftIds.has(row.id))
		.map((row) => ({
			...row,
			created_by_user_id: excludedUserIds.has(row.created_by_user_id)
				? null
				: row.created_by_user_id,
			updated_by_user_id: excludedUserIds.has(row.updated_by_user_id)
				? null
				: row.updated_by_user_id
		}))
);
rowsByTable.set(
	'shift_exceptions',
	rowsByTable.get('shift_exceptions').filter((row) => !excludedShiftIds.has(row.shift_id))
);

const queries = [
	{
		text: `truncate table ${truncateTableNames.map(tableSql).join(', ')} restart identity cascade`,
		params: []
	}
];

for (const table of tables) {
	const rows = rowsByTable.get(table.name);

	for (let rowIndex = 0; rowIndex < rows.length; rowIndex += chunkSize) {
		const chunk = rows.slice(rowIndex, rowIndex + chunkSize);
		const params = [];
		const valueGroups = chunk.map((row) => {
			const placeholders = table.columns.map((column) => {
				params.push(table.nullColumns?.includes(column) ? null : row[column]);
				const cast = table.casts?.[column];
				return cast ? `$${params.length}::${quoteIdentifier(cast)}` : `$${params.length}`;
			});

			return `(${placeholders.join(', ')})`;
		});

		if (valueGroups.length === 0) continue;

		queries.push({
			text: `insert into ${tableSql(table.name)} (${columnsSql(table.columns)}) values ${valueGroups.join(
				', '
			)}`,
			params
		});
	}
}

for (const tableName of serialTables) {
	queries.push({
		text: `select setval(pg_get_serial_sequence('${tableName}', 'id'), coalesce((select max(id) from ${tableSql(
			tableName
		)}), 1), exists(select 1 from ${tableSql(tableName)}))`,
		params: []
	});
}

await productionDb.transaction((transaction) =>
	queries.map((query) => transaction.query(query.text, query.params))
);

for (const table of tables) {
	console.log(`${table.name}: copied ${rowsByTable.get(table.name).length} row(s)`);
}

console.log('Copied test data to production.');
