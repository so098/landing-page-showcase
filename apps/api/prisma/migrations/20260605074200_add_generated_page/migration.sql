-- CreateTable
CREATE TABLE "GeneratedPage" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "modelUsed" TEXT NOT NULL,
    "previewUrl" TEXT,
    "outputDir" TEXT,
    "indexHtmlPath" TEXT,
    "stylesCssPath" TEXT,
    "scriptJsPath" TEXT,
    "htmlS3Key" TEXT,
    "cssS3Key" TEXT,
    "jsS3Key" TEXT,
    "orderSnapshot" JSONB NOT NULL,
    "quality" JSONB NOT NULL,
    "notes" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmedAt" TIMESTAMP(3),

    CONSTRAINT "GeneratedPage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GeneratedPage_jobId_key" ON "GeneratedPage"("jobId");

-- CreateIndex
CREATE INDEX "GeneratedPage_status_createdAt_idx" ON "GeneratedPage"("status", "createdAt");

-- CreateIndex
CREATE INDEX "GeneratedPage_createdAt_idx" ON "GeneratedPage"("createdAt");
