// Admin settings routes: GET/PUT settings + PUT password (đổi mật khẩu).
import { Router } from 'express';
import { asyncHandler } from '../utils/http-error.ts';
import { updateSettingsSchema, changePasswordSchema } from '../schemas/settings-schema.ts';
import { getSettings, updateSettings, changeAdminPassword } from '../services/settings-service.ts';

export const adminSettingsRouter = Router();

adminSettingsRouter.get('/', (_req, res) => {
  res.json(getSettings());
});

adminSettingsRouter.put('/', (req, res) => {
  const input = updateSettingsSchema.parse(req.body);
  res.json(updateSettings(input));
});

adminSettingsRouter.put(
  '/password',
  asyncHandler(async (req, res) => {
    const { current_password, new_password } = changePasswordSchema.parse(req.body);
    await changeAdminPassword(req.adminUsername!, current_password, new_password);
    res.json({ ok: true });
  }),
);
