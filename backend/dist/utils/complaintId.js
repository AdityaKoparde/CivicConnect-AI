"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateComplaintId = void 0;
const prisma_1 = require("../config/prisma");
const generateComplaintId = async (client = prisma_1.prisma) => {
    const year = new Date().getFullYear();
    const key = `complaint-${year}`;
    const rows = await client.$queryRaw `
    INSERT INTO "Counter" ("key", "value")
    VALUES (${key}, 1)
    ON CONFLICT ("key") DO UPDATE SET "value" = "Counter"."value" + 1
    RETURNING "value"
  `;
    const seq = rows[0]?.value ?? 1;
    return `CCAI-${year}-${String(seq).padStart(6, '0')}`;
};
exports.generateComplaintId = generateComplaintId;
//# sourceMappingURL=complaintId.js.map