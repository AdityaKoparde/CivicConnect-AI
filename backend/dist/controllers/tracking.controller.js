"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mapPoints = exports.track = void 0;
const asyncHandler_1 = require("../utils/asyncHandler");
const service_1 = require("../services/complaints/service");
const schemas_1 = require("../validators/schemas");
const errors_1 = require("../utils/errors");
exports.track = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const input = schemas_1.trackSchema.parse(req.body);
    const data = await (0, service_1.trackComplaint)({
        complaintId: input.complaintId,
        trackingToken: input.trackingToken,
        userId: req.user?.id,
    });
    res.json(data);
});
exports.mapPoints = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const scope = req.query.scope === 'admin' ? 'admin' : 'public';
    const category = typeof req.query.category === 'string' ? req.query.category : undefined;
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    if (scope === 'admin' && !req.user)
        throw (0, errors_1.badRequest)('Authentication required for admin map');
    res.json(await (0, service_1.complaintMapPoints)(req.user, scope, { category, status }));
});
//# sourceMappingURL=tracking.controller.js.map