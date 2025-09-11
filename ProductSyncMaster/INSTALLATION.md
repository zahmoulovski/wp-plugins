# WooCommerce Multi-Site Sync Pro - Installation Guide

## Quick Installation

1. **Upload Plugin Files**
   - Download/copy all plugin files to your WordPress installation
   - Place in: `/wp-content/plugins/wc-multi-sync/`

2. **Activate Plugin**
   - Go to WordPress Admin → Plugins
   - Find "WooCommerce Multi-Site Sync Pro"
   - Click "Activate"

3. **Access Plugin**
   - Look for "WC Multi-Sync" in your WordPress admin menu
   - Click to access the dashboard

## Setting Up Destination Sites

### Step 1: Generate API Keys on Destination Sites

For each destination WooCommerce site:

1. Go to **WooCommerce → Settings → Advanced → REST API**
2. Click **"Add Key"**
3. Fill out the form:
   - **Description**: "Multi-Site Sync"
   - **User**: Select an admin user
   - **Permissions**: "Read/Write"
4. Click **"Generate API Key"**
5. **Copy both Consumer Key and Consumer Secret** - you'll need these

### Step 2: Add Sites in Plugin

1. Go to **WC Multi-Sync → Sites**
2. Fill out the form:
   - **Site Name**: Friendly name (e.g., "Store Europe")
   - **Site URL**: Full URL (e.g., `https://europe.yourstore.com`)
   - **Consumer Key**: Paste from Step 1
   - **Consumer Secret**: Paste from Step 1
3. Click **"Test Connection"** to verify
4. If successful, click **"Add Site"**

### Step 3: Configure Settings

1. Go to **WC Multi-Sync → Settings**
2. Configure:
   - **Real-time Sync**: Enable for instant updates
   - **Sync Content**: Choose what to sync (images, categories, etc.)
   - **Notifications**: Enable email alerts for failures

### Step 4: Test Sync

1. Go to your source site's Products
2. Create or edit a test product
3. Check **WC Multi-Sync → Logs** to see sync activity
4. Verify the product appears on your destination sites

## Troubleshooting

### Connection Issues
- Verify the destination site URL is correct and accessible
- Ensure WooCommerce is active on destination sites
- Check that API keys have "Read/Write" permissions
- Try regenerating API keys if connection fails

### Sync Issues
- Check **WC Multi-Sync → Logs** for error details
- Ensure destination sites have adequate server resources
- Verify product data doesn't exceed API limits

### Performance
- Adjust batch size in settings if experiencing timeouts
- Consider disabling real-time sync for high-volume stores
- Monitor server resources during bulk sync operations

## Requirements

- **Source Site**: WordPress 5.0+, WooCommerce 5.0+, PHP 7.4+
- **Destination Sites**: WordPress 5.0+, WooCommerce 5.0+
- **Server**: MySQL 5.6+, adequate memory for batch processing
- **Network**: Reliable internet connection between sites

## Security Notes

- API keys provide full WooCommerce access - keep them secure
- Use HTTPS for all sites to protect API communications
- Regularly rotate API keys for enhanced security
- Monitor activity logs for any unusual sync patterns

## Support

If you encounter issues:
1. Check the activity logs for specific error messages
2. Verify all requirements are met
3. Test API connections individually
4. Review server error logs if sync operations fail