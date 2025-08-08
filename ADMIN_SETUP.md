# Firebase Admin SDK Setup Guide

## Overview
The Firebase Admin SDK allows server-side operations that bypass Firestore security rules. This is used for:
- System administration and analytics
- Batch operations and data migration
- User data deletion (GDPR compliance)
- Cleanup and maintenance tasks

## Setup Instructions

### 1. Generate Firebase Service Account Key

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project (`notion-lite-5a525`)
3. Click the gear icon → Project Settings
4. Go to "Service accounts" tab
5. Click "Generate new private key"
6. Download the JSON file (keep it secure!)

### 2. Configure Environment Variables

#### Option A: JSON String (Recommended for Deployment)
```bash
# Add to .env.local
FIREBASE_SERVICE_ACCOUNT='{"type":"service_account","project_id":"notion-lite-5a525","private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n","private_key_id":"...","client_email":"firebase-adminsdk-...@notion-lite-5a525.iam.gserviceaccount.com","client_id":"...","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url":"..."}'
```

#### Option B: File Path (For Local Development)
```bash
# Add to .env.local
GOOGLE_APPLICATION_CREDENTIALS="./firebase-service-account.json"
```

### 3. Set Admin Email
```bash
# Add to .env.local
NEXT_PUBLIC_ADMIN_EMAIL=your-admin-email@gmail.com
```

## Available Admin Features

### 1. System Statistics
- **Endpoint**: `GET /api/admin?operation=stats`
- **Purpose**: Get overview of total users, pages, blocks, archived items
- **Usage**: Monitor system growth and usage patterns

### 2. User Data Summary
- **Endpoint**: `GET /api/admin?operation=user-summary&userId=USER_ID`
- **Purpose**: Get detailed data summary for a specific user
- **Usage**: User support, debugging, data analysis

### 3. Cleanup Operations
- **Endpoint**: `GET /api/admin?operation=cleanup`
- **Purpose**: Remove orphaned blocks and invalid references
- **Usage**: System maintenance, data integrity

### 4. User Data Deletion
- **Endpoint**: `DELETE /api/admin?userId=USER_ID`
- **Purpose**: Permanently delete all user data (GDPR compliance)
- **Usage**: Account deletion, data privacy compliance

### 5. Admin Dashboard
- **URL**: `/admin`
- **Purpose**: Web interface for all admin operations
- **Usage**: Easy access to admin functions without API calls

## Security Considerations

### Production Security
- [ ] Add proper authentication to admin routes
- [ ] Implement rate limiting on admin endpoints
- [ ] Log all admin operations for audit trail
- [ ] Add IP whitelisting for admin access
- [ ] Use HTTPS only for admin operations

### Environment Security
- [ ] Never commit service account keys to version control
- [ ] Use environment variables for all sensitive data
- [ ] Rotate service account keys regularly
- [ ] Monitor admin operations in Firebase logs

## Usage Examples

### Get System Statistics
```bash
curl http://localhost:3002/api/admin?operation=stats
```

### Get User Summary
```bash
curl "http://localhost:3002/api/admin?operation=user-summary&userId=USER_ID_HERE"
```

### Run Cleanup
```bash
curl http://localhost:3002/api/admin?operation=cleanup
```

### Delete User Data (DANGEROUS)
```bash
curl -X DELETE "http://localhost:3002/api/admin?userId=USER_ID_HERE"
```

## Error Handling

### Common Issues
1. **"Firebase Admin SDK not available"**
   - Check environment variables are set correctly
   - Verify service account JSON is valid
   - Ensure project ID matches

2. **"Admin SDK not initialized"**
   - Service account key is invalid or missing
   - Check Firebase console for service account status

3. **Permission denied errors**
   - Service account doesn't have required permissions
   - Project ID mismatch

### Debugging
1. Check server console for detailed error messages
2. Verify environment variables are loaded: `console.log(process.env.FIREBASE_SERVICE_ACCOUNT ? 'Set' : 'Not set')`
3. Test with minimal service account permissions first

## Development vs Production

### Development
- Admin SDK is optional (graceful degradation)
- Console warnings when SDK unavailable
- Test admin features with sample data

### Production
- Admin SDK required for full functionality
- All admin operations logged
- Proper authentication and authorization required

## Migration and Maintenance

### Data Migration Example
```typescript
// Use adminOperations.migrateAllUserData for schema changes
await adminOperations.migrateAllUserData(
  'add-order-field-to-pages',
  async (userId) => {
    // Migration logic here
    return { migrated: true };
  }
);
```

### Regular Maintenance
- Run cleanup operations monthly
- Monitor system statistics weekly
- Archive old data based on usage patterns
- Review admin access logs regularly
