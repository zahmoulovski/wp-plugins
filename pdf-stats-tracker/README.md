# PDF Stats Tracker

A WordPress plugin to track PDF file views and downloads from specific folders on your website.

## Description

PDF Stats Tracker monitors PDF files in specified folders on your website and tracks when users view or download these files. It provides detailed statistics about PDF interactions through an admin dashboard.

Currently tracked folders:
- https://klarrion.com/catalogue/
- https://klarrion.com/fichtech/

## Features

- Track PDF views and downloads from specific folders
- View statistics by folder (Catalogue and Fichtech)
- See total views/downloads, daily, weekly, and monthly stats
- Export statistics in CSV format
- Mobile-friendly admin interface
- Search functionality to quickly find PDFs

## Installation

1. Upload the entire `pdf-stats-tracker` folder to the `/wp-content/plugins/` directory.
2. Activate the plugin through the 'Plugins' menu in WordPress.
3. Access the plugin via the 'PDF Stats' menu in your WordPress admin dashboard.

## Usage

### Tracking PDFs

The plugin automatically tracks PDFs from the specified folders when:
- A user hovers over a PDF link (counted as a view)
- A user clicks on a PDF link (counted as a download)

No configuration is needed to start tracking.

### Viewing Statistics

1. Go to your WordPress admin dashboard
2. Click on "PDF Stats" in the left menu
3. View the dashboard for overall statistics
4. Use the submenus to view detailed stats for each folder:
   - Catalogue Stats
   - Fichtech Stats

### Exporting Data

1. Navigate to either "Catalogue Stats" or "Fichtech Stats" page
2. Scroll down to the "Export Data" section
3. Select your preferred format (CSV or Excel)
4. Click the "Export" button to download the file

## Customization

To track additional folders, modify the `$folders` array in the `pdf-stats-tracker.php` file.

```php
private $folders = array(
    'catalogue' => 'https://klarrion.com/catalogue/',
    'fichtech' => 'https://klarrion.com/fichtech/'
    // Add new folders here
);
```

## Requirements

- WordPress 5.0 or higher
- PHP 7.0 or higher

## Support

For support or questions, please contact the plugin developer.

## License

This plugin is licensed under the GPL v2 or later.