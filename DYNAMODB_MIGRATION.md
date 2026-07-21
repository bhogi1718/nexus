# MongoDB to DynamoDB Migration Guide

## 📋 Overview

This guide walks you through migrating Nexus Messenger from **MongoDB Atlas** to **AWS DynamoDB**.

**Duration:** 30-60 minutes (if DynamoDB tables already exist)  
**Downtime:** ~5 minutes (during data migration)  
**Data Loss:** None (non-destructive)

---

## ✅ Pre-Migration Checklist

- [ ] AWS Account with DynamoDB access
- [ ] DynamoDB tables created (see Table Setup below)
- [ ] Backup of MongoDB database
- [ ] Application code updated to DynamoDB models
- [ ] Environment variables configured
- [ ] Test environment ready

---

## 🗄️ Step 1: Create DynamoDB Tables

### Option A: AWS Console (Manual)

1. **Go to DynamoDB** → Create Table → **nexus-users**
   - Partition Key: `userId` (String)
   - Sort Key: (none)
   - Add GSI: `email-index` (Partition Key: `email`)
   - On-demand billing

2. **Create Table** → **nexus-conversations**
   - Partition Key: `conversationId` (String)
   - Sort Key: (none)
   - On-demand billing

3. **Create Table** → **nexus-messages**
   - Partition Key: `conversationId` (String)
   - Sort Key: `createdAt` (String)
   - Add GSI: `conversationId-createdAt-index`
   - On-demand billing

4. **Create Table** → **nexus-otps**
   - Partition Key: `otpId` (String)
   - Sort Key: (none)
   - Add GSI: `email-index` (Partition Key: `email`)
   - TTL: Set `expiresAt` field for auto-deletion
   - On-demand billing

### Option B: AWS CLI (Automated)

```bash
# Users table
aws dynamodb create-table \
  --table-name nexus-users \
  --attribute-definitions AttributeName=userId,AttributeType=S AttributeName=email,AttributeType=S \
  --key-schema AttributeName=userId,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --global-secondary-indexes '[
    {
      "IndexName": "email-index",
      "KeySchema": [{"AttributeName": "email", "KeyType": "HASH"}],
      "Projection": {"ProjectionType": "ALL"},
      "ProvisionedThroughput": {"ReadCapacityUnits": 5, "WriteCapacityUnits": 5}
    }
  ]'

# Messages table (similar for others)
aws dynamodb create-table \
  --table-name nexus-messages \
  --attribute-definitions AttributeName=conversationId,AttributeType=S AttributeName=createdAt,AttributeType=S \
  --key-schema AttributeName=conversationId,KeyType=HASH AttributeName=createdAt,KeyType=RANGE \
  --billing-mode PAY_PER_REQUEST

# Conversations table
aws dynamodb create-table \
  --table-name nexus-conversations \
  --attribute-definitions AttributeName=conversationId,AttributeType=S \
  --key-schema AttributeName=conversationId,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST

# OTPs table with TTL
aws dynamodb create-table \
  --table-name nexus-otps \
  --attribute-definitions AttributeName=otpId,AttributeType=S AttributeName=email,AttributeType=S \
  --key-schema AttributeName=otpId,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --global-secondary-indexes '[
    {
      "IndexName": "email-index",
      "KeySchema": [{"AttributeName": "email", "KeyType": "HASH"}],
      "Projection": {"ProjectionType": "ALL"},
      "ProvisionedThroughput": {"ReadCapacityUnits": 5, "WriteCapacityUnits": 5}
    }
  ]'

# Enable TTL on OTPs table
aws dynamodb update-time-to-live \
  --table-name nexus-otps \
  --time-to-live-specification AttributeName=expiresAt,Enabled=true
```

### Option C: Terraform

```hcl
# terraform/dynamodb.tf

resource "aws_dynamodb_table" "users" {
  name           = "nexus-users"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "userId"

  attribute {
    name = "userId"
    type = "S"
  }

  attribute {
    name = "email"
    type = "S"
  }

  global_secondary_index {
    name            = "email-index"
    hash_key        = "email"
    projection_type = "ALL"
  }
}

# Similar for other tables...
```

---

## 🔄 Step 2: Migrate Data from MongoDB

### 1. Install Dependencies

```bash
npm install
```

### 2. Prepare .env

```bash
# Ensure these are set:
MONGODB_URI=your-mongodb-atlas-connection-string
AWS_REGION=us-east-1
AWS_S3_BUCKET=your-bucket
DYNAMODB_USERS_TABLE=nexus-users
DYNAMODB_MESSAGES_TABLE=nexus-messages
DYNAMODB_CONVERSATIONS_TABLE=nexus-conversations
DYNAMODB_OTPS_TABLE=nexus-otps
NODE_ENV=development
```

### 3. Run Migration Script

```bash
node scripts/migrate-mongodb-to-dynamodb.js
```

**Output:**
```
🚀 Starting MongoDB → DynamoDB Migration

📥 Migrating Users...
  Found 42 users to migrate
  ✓ Migrated 10/42 users
  ✓ Migrated 20/42 users
  ...
✅ Users migration complete (42 total)

📥 Migrating Conversations...
  Found 156 conversations to migrate
  ...
✅ Conversations migration complete (156 total)

📥 Migrating Messages...
  Found 3,421 messages to migrate
  ...
✅ Messages migration complete (3,421 total)

📥 Migrating OTPs...
  Found 8 OTPs to migrate
  ✓ Skipping 3 expired OTPs
✅ OTPs migration complete (8 total)

✅ Migration Complete!
```

### 4. Verify Migration

```bash
# Check table sizes (from AWS Console)
# Users: ~42 items
# Conversations: ~156 items
# Messages: ~3,421 items
# OTPs: ~5-8 items (non-expired)
```

---

## 🔐 Step 3: Configure Environment

### Update .env

```env
# Remove or comment out:
# MONGODB_URI=...

# Add/verify DynamoDB:
AWS_REGION=us-east-1
DYNAMODB_USERS_TABLE=nexus-users
DYNAMODB_MESSAGES_TABLE=nexus-messages
DYNAMODB_CONVERSATIONS_TABLE=nexus-conversations
DYNAMODB_OTPS_TABLE=nexus-otps
```

### Update index.js

Remove MongoDB initialization:

```javascript
// DELETE THIS:
// import mongoose from 'mongoose';
// mongoose.connect(process.env.MONGODB_URI);

// Keep AWS SDK (already there for S3/SES)
```

---

## 🚀 Step 4: Deploy Changes

### 1. Update Database Models

The new DynamoDB models are already in:
- `server/models/User.js`
- `server/models/Message.js`
- `server/models/Conversation.js`
- `server/models/OTP.js`

No changes needed - they're already using DynamoDB!

### 2. Install New Dependencies

```bash
cd server
npm install
```

### 3. Test Locally

```bash
npm run dev
```

**Test these endpoints:**
- ✓ Signup (OTP)
- ✓ Login (OTP)
- ✓ Send message
- ✓ Get conversations
- ✓ Upload file
- ✓ Add contact

### 4. Deploy to EC2

```bash
# On your local machine
./scripts/deploy-to-ec2.sh <EC2_IP> <keypair>

# On EC2
pm2 restart nexus-server
```

---

## 💰 Cost Comparison

### MongoDB Atlas
```
Free tier: 512 MB storage
Production:
  M2 cluster: ~$57/month
  M10 cluster: ~$119/month
```

### DynamoDB (On-Demand)
```
Pricing per-request:
  Read: $0.25/million reads
  Write: $1.25/million writes
  Storage: $0.25/GB

Example (1,000 users, 100k reads/month):
  Reads: 100k × $0.25/1M = $0.025
  Writes: 20k × $1.25/1M = $0.025
  Storage: 50GB × $0.25 = $12.50
  Total: ~$12.50/month
```

**DynamoDB is 5-10x cheaper for small-to-medium apps!**

---

## 🔄 Rollback Plan

If issues occur after migration:

### Option 1: Keep MongoDB Running (Safest)

1. Keep MongoDB Atlas running during transition
2. If critical issues, revert .env to point at MongoDB
3. Restart app: `pm2 restart nexus-server`
4. No data loss, quick rollback

### Option 2: Backup Before Migration

```bash
# Backup MongoDB
mongodump --uri="$MONGODB_URI" --out=./backup

# If rollback needed:
mongorestore ./backup
```

---

## ⚠️ Known Differences (MongoDB → DynamoDB)

| Feature | MongoDB | DynamoDB |
|---------|---------|----------|
| **Auto ID** | ObjectId | Manual UUID |
| **Transactions** | Multi-doc | Single partition key |
| **Indexes** | Flexible | Must pre-define |
| **Query** | Rich query language | Simple key/value |
| **Scaling** | Auto (Atlas) | Manual provisioning |

**Impact:** Low - models handle these differences!

---

## 🛠️ Troubleshooting

### "Table does not exist"
```bash
# Verify tables exist:
aws dynamodb list-tables

# Or check AWS Console → DynamoDB → Tables
```

### "User not found" after migration
```bash
# Check data was migrated:
aws dynamodb scan --table-name nexus-users --limit 5

# If empty, re-run migration script
```

### "Cannot read contacts of undefined"
```bash
# Some users might not have contacts array
# Models handle this - try restarting

pm2 restart nexus-server
```

### Performance issues
```bash
# Check CloudWatch metrics:
# - ProvisionedThroughputExceededException → increase capacity
# - High latency → check GSI queries

# Enable debug logging:
DEBUG=* npm run dev
```

---

## 📊 Post-Migration Checklist

- [ ] Data migrated successfully
- [ ] All tables showing correct item counts
- [ ] .env updated for DynamoDB
- [ ] MongoDB connection removed from code
- [ ] Tests passing locally
- [ ] App deployed to EC2
- [ ] All features working (signup, login, messaging, files)
- [ ] No errors in PM2 logs
- [ ] Monitoring configured in CloudWatch
- [ ] Backup of old MongoDB taken

---

## 📈 Next Steps

1. **Monitor Performance:** Check CloudWatch for 24 hours
2. **Optimize Queries:** Use GSIs for common queries
3. **Enable Autoscaling:** If using provisioned mode
4. **Schedule Backups:** Use DynamoDB snapshots/backups
5. **Plan Cleanup:** Delete MongoDB Atlas cluster after 30 days (if confident)

---

## 💡 Pro Tips

1. **Keep MongoDB for 30 days** as insurance
2. **Use On-Demand billing** initially, switch to provisioned later
3. **Enable DynamoDB Streams** for advanced features
4. **Set up CloudWatch alarms** for table health
5. **Test query performance** before deleting old data

---

**Migration Complete! You're now fully on DynamoDB! 🎉**
