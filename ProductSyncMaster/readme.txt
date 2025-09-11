=== WooCommerce Multi-Site Sync Pro ===
Contributors: yourname
Tags: woocommerce, sync, multi-site, products, automation
Requires at least: 5.0
Tested up to: 6.4
Requires PHP: 7.4
Stable tag: 2.0.0
License: GPL v2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Advanced WooCommerce product synchronization across multiple sites with real-time sync, automated conflict resolution, and comprehensive management dashboard.

== Description ==

WooCommerce Multi-Site Sync Pro is the ultimate solution for managing product synchronization across multiple WooCommerce websites. Whether you have 2 sites or 20, this plugin makes it effortless to keep your product catalogs in perfect sync.

= Key Features =

**🚀 Real-Time Synchronization**
- Instant product sync when changes are made
- Live updates without manual intervention
- WebSocket integration for immediate notifications

**📊 Comprehensive Dashboard**
- Beautiful admin interface with statistics
- Real-time sync monitoring
- Activity logs and error tracking

**🎯 Smart Sync Rules**
- Category-based filtering
- Price range restrictions  
- Custom sync conditions per site

**⚡ Fast & Reliable**
- Batch processing for bulk operations
- Queue-based sync jobs
- Automatic retry on failures

**🔧 Easy Setup**
- Simple site configuration
- One-click connection testing
- Automated webhook registration

= What Gets Synced =

- Product information (name, description, price, SKU)
- Product images and galleries
- Categories and tags
- Product variations and attributes
- Inventory levels (optional)
- Custom fields and meta data

= Perfect For =

- Multi-brand retailers
- Dropshipping businesses
- Franchise operations
- International stores
- Wholesale distributors

== Installation ==

1. Upload the plugin files to `/wp-content/plugins/wc-multi-sync/`
2. Activate the plugin through the 'Plugins' screen in WordPress
3. Go to WC Multi-Sync > Settings to configure the plugin
4. Add your destination sites in WC Multi-Sync > Sites
5. Test connections and start syncing!

= Requirements =

- WooCommerce 5.0 or higher
- WordPress 5.0 or higher
- PHP 7.4 or higher
- MySQL 5.6 or higher

== Frequently Asked Questions ==

= How many sites can I sync to? =

There's no hard limit on the number of destination sites. The plugin is designed to handle multiple sites efficiently through queue-based processing.

= Will this work with variable products? =

Yes! The plugin fully supports variable products, including all variations and their individual settings.

= Can I sync specific categories only? =

Absolutely. You can set up sync rules to only sync products from specific categories, or exclude certain categories.

= What happens if a sync fails? =

Failed syncs are logged and can be retried. The plugin includes comprehensive error handling and will attempt to resolve common issues automatically.

= Does this affect my site performance? =

No. All sync operations are performed in the background using WordPress cron jobs and don't affect your site's front-end performance.

= Can I sync inventory levels? =

Yes, inventory synchronization is available as an optional feature that can be enabled in the settings.

== Screenshots ==

1. Main dashboard showing sync statistics and recent activity
2. Sites management interface with connection status
3. Sync rules configuration for advanced filtering
4. Activity logs showing detailed sync history
5. Settings page with comprehensive options

== Changelog ==

= 2.0.0 =
* Complete rewrite with modern architecture
* Added real-time sync capabilities
* New dashboard with comprehensive statistics
* Improved error handling and logging
* Added webhook support for instant updates
* Enhanced security and performance
* Better mobile responsiveness

= 1.5.0 =
* Added support for product variations
* Improved batch processing
* Added category-based sync rules
* Enhanced error reporting

= 1.0.0 =
* Initial release
* Basic product synchronization
* Simple admin interface

== Upgrade Notice ==

= 2.0.0 =
Major update with new features and improved performance. Please backup your site before updating.

== Support ==

For support, feature requests, or bug reports, please visit our support forum or contact us directly.

== Privacy Policy ==

This plugin does not collect or store any personal data from your website visitors. It only processes product data for synchronization purposes between your configured WooCommerce sites.