ALTER TABLE application_documents ADD COLUMN "supersededAt" TIMESTAMP(3);
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY "applicationId", type ORDER BY "createdAt" DESC, id DESC) AS position
  FROM application_documents
)
UPDATE application_documents SET "supersededAt" = CURRENT_TIMESTAMP
WHERE id IN (SELECT id FROM ranked WHERE position > 1);
CREATE UNIQUE INDEX application_documents_one_current_type
  ON application_documents ("applicationId", type) WHERE "supersededAt" IS NULL;
UPDATE applications AS application SET "passportPath" = document.path,
  "passportFileType" = document."fileType", "passportFileSize" = document."fileSize"
FROM application_documents AS document
WHERE document."applicationId" = application.id AND document.type = 'PASSPORT' AND document."supersededAt" IS NULL;
