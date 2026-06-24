ALTER TABLE "shift_exceptions" ADD CONSTRAINT "shift_exceptions_action_check" CHECK ("action" IN ('cancelled'));
