-- CreateTable
CREATE TABLE "Category" (
    "key" TEXT NOT NULL,
    "label" JSONB NOT NULL,
    "description" JSONB NOT NULL DEFAULT '{}',
    "icon" TEXT NOT NULL DEFAULT 'FileText',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("key")
);
