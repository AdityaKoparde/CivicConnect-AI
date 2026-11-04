"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.duplicate = exports.update = exports.assign = exports.status = exports.detail = exports.list = void 0;
const asyncHandler_1 = require("../utils/asyncHandler");
const auth_1 = require("../middleware/auth");
const service_1 = require("../services/complaints/service");
const schemas_1 = require("../validators/schemas");
exports.list = [
    (0, auth_1.requireRole)('SUPER_ADMIN', 'DEPARTMENT_ADMIN', 'DEPARTMENT_OFFICER'),
    (0, asyncHandler_1.asyncHandler)(async (req, res) => {
        const filters = schemas_1.listComplaintsQuerySchema.parse(req.query);
        res.json(await (0, service_1.listComplaints)(req.user, filters));
    }),
];
exports.detail = [
    (0, auth_1.requireRole)('SUPER_ADMIN', 'DEPARTMENT_ADMIN', 'DEPARTMENT_OFFICER'),
    (0, asyncHandler_1.asyncHandler)(async (req, res) => {
        res.json(await (0, service_1.getComplaintDetail)(req.user, req.params.id));
    }),
];
exports.status = [
    (0, auth_1.requireRole)('SUPER_ADMIN', 'DEPARTMENT_ADMIN', 'DEPARTMENT_OFFICER'),
    (0, asyncHandler_1.asyncHandler)(async (req, res) => {
        const input = schemas_1.statusChangeSchema.parse(req.body);
        await (0, service_1.changeStatus)(req.user, req.params.id, input.status, input.note, req.ip);
        res.json({ ok: true });
    }),
];
exports.assign = [
    (0, auth_1.requireRole)('SUPER_ADMIN', 'DEPARTMENT_ADMIN'),
    (0, asyncHandler_1.asyncHandler)(async (req, res) => {
        const input = schemas_1.assignSchema.parse(req.body);
        if (!input.departmentId && !input.officerId) {
            res.status(400).json({
                error: { code: 'VALIDATION_ERROR', message: 'departmentId or officerId required', details: [] },
            });
            return;
        }
        await (0, service_1.assignComplaint)(req.user, req.params.id, input, req.ip);
        res.json({ ok: true });
    }),
];
exports.update = [
    (0, auth_1.requireRole)('SUPER_ADMIN', 'DEPARTMENT_ADMIN', 'DEPARTMENT_OFFICER'),
    (0, asyncHandler_1.asyncHandler)(async (req, res) => {
        const input = schemas_1.complaintUpdateSchema.parse(req.body);
        await (0, service_1.addComplaintUpdate)(req.user, req.params.id, input, req.ip);
        res.status(201).json({ ok: true });
    }),
];
exports.duplicate = [
    (0, auth_1.requireRole)('SUPER_ADMIN', 'DEPARTMENT_ADMIN', 'DEPARTMENT_OFFICER'),
    (0, asyncHandler_1.asyncHandler)(async (req, res) => {
        const input = schemas_1.duplicateSchema.parse(req.body);
        await (0, service_1.linkDuplicate)(req.user, req.params.id, input.duplicateOfId, req.ip);
        res.json({ ok: true });
    }),
];
//# sourceMappingURL=complaints.controller.js.map