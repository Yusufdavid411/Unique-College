CREATE TABLE "website_page_views" (
  "id" TEXT NOT NULL,
  "day" DATE NOT NULL,
  "path" VARCHAR(120) NOT NULL,
  "visitorHash" VARCHAR(64) NOT NULL,
  "device" VARCHAR(10) NOT NULL,
  "referrer" VARCHAR(253) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "website_page_views_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "website_page_views_day_visitorHash_idx" ON "website_page_views"("day", "visitorHash");
CREATE INDEX "website_page_views_day_path_idx" ON "website_page_views"("day", "path");
