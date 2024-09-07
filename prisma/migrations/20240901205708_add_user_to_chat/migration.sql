/*
  Warnings:

  - Added the required column `userId` to the `Chat` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- Insert a default user
INSERT INTO "User" (id, email, password) VALUES ('default-user-id', 'default@example.com', 'default-password');

-- Create a new Chat table with the userId column
CREATE TABLE "NewChat" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "userId" TEXT NOT NULL,
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Copy data from the old Chat table to the new one
INSERT INTO "NewChat" (id, createdAt, updatedAt, userId)
SELECT id, createdAt, updatedAt, 'default-user-id'
FROM "Chat";

-- Drop the old Chat table
DROP TABLE "Chat";

-- Rename the new Chat table to Chat
ALTER TABLE "NewChat" RENAME TO "Chat";

-- Create a new Message table with the updated foreign key
CREATE TABLE "NewMessage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    FOREIGN KEY ("chatId") REFERENCES "Chat"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Copy data from the old Message table to the new one
INSERT INTO "NewMessage" (id, createdAt, role, content, chatId)
SELECT id, createdAt, role, content, chatId
FROM "Message";

-- Drop the old Message table
DROP TABLE "Message";

-- Rename the new Message table to Message
ALTER TABLE "NewMessage" RENAME TO "Message";
