import { error } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';

import { db } from '$lib/server/db';
import { user, type userRoleValues } from '$lib/server/db/auth.schema';

export type UserRole = (typeof userRoleValues)[number];

export type RoleCapabilities = {
	canManageTeamMembers: boolean;
	canManageShifts: boolean;
};

const shiftManagerRoles = new Set<UserRole>(['system_admin', 'scheduler']);

export function getRoleCapabilities(role: UserRole): RoleCapabilities {
	return {
		canManageTeamMembers: shiftManagerRoles.has(role),
		canManageShifts: shiftManagerRoles.has(role)
	};
}

export async function getUserRole(userId: string) {
	const [row] = await db.select({ role: user.role }).from(user).where(eq(user.id, userId)).limit(1);

	if (!row) {
		error(401, 'Unauthorized');
	}

	return row.role;
}

export async function requireSystemAdmin(userId: string) {
	const role = await getUserRole(userId);

	if (role !== 'system_admin') {
		error(403, 'System admin access required');
	}

	return role;
}

export async function requireTeamMemberManager(userId: string) {
	return requireShiftManager(userId);
}

export async function requireShiftManager(userId: string) {
	const role = await getUserRole(userId);

	if (!shiftManagerRoles.has(role)) {
		error(403, 'Schedule edit access required');
	}

	return role;
}
