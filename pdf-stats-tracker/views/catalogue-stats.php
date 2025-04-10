<div class="wrap">
    <h1><?php _e('PDF Stats Tracker - Catalogue Stats', 'pdf-stats-tracker'); ?></h1>
    
    <p>
        <?php _e('Statistics for PDF files in the <strong>catalogue</strong> folder:', 'pdf-stats-tracker'); ?>
        <code>https://klarrion.com/catalogue/</code>
    </p>
    
    <div class="pdf-stats-search-box">
        <input type="text" id="pdf-stats-search" placeholder="<?php _e('Search PDFs...', 'pdf-stats-tracker'); ?>" class="regular-text">
    </div>
    
    <div class="pdf-stats-table-container">
        <?php if (empty($catalogue_stats)) : ?>
            <p><?php _e('No data available yet for catalogue PDFs.', 'pdf-stats-tracker'); ?></p>
        <?php else : ?>
            <table class="widefat striped pdf-stats-table">
                <thead>
                    <tr>
                        <th><?php _e('PDF File', 'pdf-stats-tracker'); ?></th>
                        <th><?php _e('Views', 'pdf-stats-tracker'); ?></th>
                        <th><?php _e('Downloads', 'pdf-stats-tracker'); ?></th>
                        <th><?php _e('First Access', 'pdf-stats-tracker'); ?></th>
                        <th><?php _e('Last Access', 'pdf-stats-tracker'); ?></th>
                        <th><?php _e('Actions', 'pdf-stats-tracker'); ?></th>
                    </tr>
                </thead>
                <tbody>
                    <?php foreach ($catalogue_stats as $pdf) : ?>
                        <tr>
                            <td>
                                <?php 
                                $filename = basename($pdf->pdf_url);
                                echo esc_html($filename); 
                                ?>
                            </td>
                            <td><?php echo intval($pdf->views); ?></td>
                            <td><?php echo intval($pdf->downloads); ?></td>
                            <td>
                                <?php 
                                $first_date = new DateTime($pdf->first_access);
                                echo esc_html($first_date->format('Y-m-d H:i')); 
                                ?>
                            </td>
                            <td>
                                <?php 
                                $last_date = new DateTime($pdf->last_access);
                                echo esc_html($last_date->format('Y-m-d H:i')); 
                                ?>
                            </td>
                            <td>
                                <a href="<?php echo esc_url($pdf->pdf_url); ?>" target="_blank">
                                    <?php _e('View PDF', 'pdf-stats-tracker'); ?>
                                </a>
                            </td>
                        </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>
        <?php endif; ?>
    </div>
    
    <div class="pdf-stats-export">
        <h3><?php _e('Export Data', 'pdf-stats-tracker'); ?></h3>
        <p><?php _e('Export the data for reporting or further analysis.', 'pdf-stats-tracker'); ?></p>
        
        <form method="post" action="">
            <?php wp_nonce_field('pdf_stats_export', 'pdf_stats_export_nonce'); ?>
            <input type="hidden" name="export_folder" value="catalogue">
            
            <div class="pdf-stats-export-options">
                <label>
                    <input type="radio" name="export_format" value="csv" checked>
                    <?php _e('CSV Format', 'pdf-stats-tracker'); ?>
                </label>
                
                <label>
                    <input type="radio" name="export_format" value="excel">
                    <?php _e('Excel Format', 'pdf-stats-tracker'); ?>
                </label>
            </div>
            
            <p>
                <button type="submit" name="pdf_stats_export" class="button button-primary">
                    <?php _e('Export', 'pdf-stats-tracker'); ?>
                </button>
            </p>
        </form>
    </div>
</div>

<style>
    .pdf-stats-table-container {
        margin-top: 20px;
        margin-bottom: 30px;
        overflow-x: auto;
    }
    
    .pdf-stats-table {
        min-width: 100%;
    }
    
    .pdf-stats-export {
        margin-top: 30px;
        background: #fff;
        padding: 15px;
        border: 1px solid #ddd;
        border-radius: 3px;
    }
    
    .pdf-stats-export-options {
        margin: 15px 0;
    }
    
    .pdf-stats-export-options label {
        margin-right: 15px;
    }
</style>