"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.publicStats = publicStats;
exports.adminStats = adminStats;
const prisma_1 = require("../../config/prisma");
const constants_1 = require("../../config/constants");
const service_1 = require("../complaints/service");
async function publicStats() {
    const [total, resolved, rejected, activeDepartments, demoCount, districts] = await Promise.all([
        prisma_1.prisma.complaint.count(),
        prisma_1.prisma.complaint.count({ where: { status: 'RESOLVED' } }),
        prisma_1.prisma.complaint.count({ where: { status: 'REJECTED' } }),
        prisma_1.prisma.department.count({ where: { active: true } }),
        prisma_1.prisma.complaint.count({ where: { isDemo: true } }),
        prisma_1.prisma.complaint.groupBy({ by: ['district'], where: { district: { not: null } } }),
    ]);
    return {
        totalComplaints: total,
        resolvedComplaints: resolved,
        pendingComplaints: Math.max(0, total - resolved - rejected),
        activeDepartments,
        districtsCovered: districts.length,
        isDemoData: demoCount > 0,
        lastUpdated: new Date().toISOString(),
    };
}
const lightSelect = {
    id: true, createdAt: true, status: true, category: true,
    priority: true, departmentId: true, district: true, isDemo: true,
};
async function adminStats(user) {
    const scope = await (0, service_1.officerScope)(user);
    const rows = await prisma_1.prisma.complaint.findMany({
        where: scope,
        select: lightSelect,
    });
    const now = new Date();
    const dayMs = 24 * 3600_000;
    const overview = {
        total: rows.length,
        newLast24h: rows.filter((r) => now.getTime() - r.createdAt.getTime() < dayMs).length,
        pending: rows.filter((r) => r.status === 'SUBMITTED' || r.status === 'ACKNOWLEDGED').length,
        inProgress: rows.filter((r) => ['ASSIGNED', 'IN_PROGRESS', 'AWAITING_CITIZEN_INFO'].includes(r.status)).length,
        resolved: rows.filter((r) => r.status === 'RESOLVED').length,
        escalated: rows.filter((r) => r.status === 'ESCALATED').length,
        critical: rows.filter((r) => r.priority === 'CRITICAL').length,
        awaitingCitizen: rows.filter((r) => r.status === 'AWAITING_CITIZEN_INFO').length,
    };
    const countBy = (key) => {
        const m = new Map();
        for (const r of rows) {
            const k = key(r) ?? 'Unassigned';
            m.set(k, (m.get(k) ?? 0) + 1);
        }
        return m;
    };
    const byCategory = [...countBy((r) => r.category).entries()]
        .map(([key, count]) => ({
        key,
        label: constants_1.CATEGORY_MAP.get(key)?.label.en ?? key,
        count,
    }))
        .sort((a, b) => b.count - a.count);
    const departmentNames = await prisma_1.prisma.department.findMany({
        select: { id: true, name: true },
    });
    const deptName = new Map(departmentNames.map((d) => [d.id, d.name]));
    const byDepartment = [...countBy((r) => r.departmentId).entries()].map(([id, count]) => ({ id, name: deptName.get(id) ?? 'Unassigned', count })).sort((a, b) => b.count - a.count);
    const byDistrict = [...countBy((r) => r.district).entries()]
        .map(([district, count]) => ({ district, count }))
        .sort((a, b) => b.count - a.count);
    const priorityDistribution = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map((priority) => ({
        priority,
        count: rows.filter((r) => r.priority === priority).length,
    }));
    // monthly trend — last 12 months
    const monthlyMap = new Map();
    for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        monthlyMap.set(key, { month: key, total: 0, resolved: 0 });
    }
    for (const r of rows) {
        const d = r.createdAt;
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const bucket = monthlyMap.get(key);
        if (bucket) {
            bucket.total += 1;
            if (r.status === 'RESOLVED')
                bucket.resolved += 1;
        }
    }
    // pending trend — open complaints at end of each of the last 30 days
    const pendingTrend = [];
    for (let i = 29; i >= 0; i--) {
        const dayEnd = new Date(now.getTime() - i * dayMs);
        const label = dayEnd.toISOString().slice(0, 10);
        const pending = rows.filter((r) => r.createdAt <= dayEnd &&
            (r.status === 'RESOLVED' || r.status === 'REJECTED'
                ? false
                : true)).length;
        // approximate: resolved-after-dayEnd counted as open
        const openApprox = rows.filter((r) => {
            if (r.createdAt > dayEnd)
                return false;
            if (r.status === 'RESOLVED' || r.status === 'REJECTED')
                return false;
            return true;
        }).length;
        pendingTrend.push({ date: label, pending: openApprox || pending });
    }
    const resolutionRate = rows.length === 0
        ? 0
        : Math.round((overview.resolved / rows.length) * 100) / 100;
    return {
        overview,
        byCategory,
        byDepartment,
        byDistrict,
        monthly: [...monthlyMap.values()],
        priorityDistribution,
        pendingTrend,
        resolutionRate,
        isDemoData: rows.some((r) => r.isDemo),
    };
}
//# sourceMappingURL=service.js.map