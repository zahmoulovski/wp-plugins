<div class="wrap">
    <h1><?php _e('PDF Stats Tracker - Dashboard', 'pdf-stats-tracker'); ?></h1>
    
    <div class="pdf-stats-overview">
        <h2><?php _e('Overview', 'pdf-stats-tracker'); ?></h2>
        
        <div class="pdf-stats-boxes">
            <!-- Total Views and Downloads -->
            <div class="pdf-stats-box">
                <h3><?php _e('Total Statistics', 'pdf-stats-tracker'); ?></h3>
                <table class="widefat">
                    <thead>
                        <tr>
                            <th><?php _e('Action', 'pdf-stats-tracker'); ?></th>
                            <th><?php _e('Count', 'pdf-stats-tracker'); ?></th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td><?php _e('PDF Views', 'pdf-stats-tracker'); ?></td>
                            <td><?php echo intval($total_views); ?></td>
                        </tr>
                        <tr>
                            <td><?php _e('PDF Downloads', 'pdf-stats-tracker'); ?></td>
                            <td><?php echo intval($total_downloads); ?></td>
                        </tr>
                    </tbody>
                </table>
            </div>
            
            <!-- Today's Stats -->
            <div class="pdf-stats-box">
                <h3><?php _e('Today', 'pdf-stats-tracker'); ?></h3>
                <table class="widefat">
                    <thead>
                        <tr>
                            <th><?php _e('Action', 'pdf-stats-tracker'); ?></th>
                            <th><?php _e('Count', 'pdf-stats-tracker'); ?></th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td><?php _e('PDF Views', 'pdf-stats-tracker'); ?></td>
                            <td><?php echo intval($today_views); ?></td>
                        </tr>
                        <tr>
                            <td><?php _e('PDF Downloads', 'pdf-stats-tracker'); ?></td>
                            <td><?php echo intval($today_downloads); ?></td>
                        </tr>
                    </tbody>
                </table>
            </div>
            
            <!-- This Week's Stats -->
            <div class="pdf-stats-box">
                <h3><?php _e('This Week', 'pdf-stats-tracker'); ?></h3>
                <table class="widefat">
                    <thead>
                        <tr>
                            <th><?php _e('Action', 'pdf-stats-tracker'); ?></th>
                            <th><?php _e('Count', 'pdf-stats-tracker'); ?></th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td><?php _e('PDF Views', 'pdf-stats-tracker'); ?></td>
                            <td><?php echo intval($week_views); ?></td>
                        </tr>
                        <tr>
                            <td><?php _e('PDF Downloads', 'pdf-stats-tracker'); ?></td>
                            <td><?php echo intval($week_downloads); ?></td>
                        </tr>
                    </tbody>
                </table>
            </div>
            
            <!-- This Month's Stats -->
            <div class="pdf-stats-box">
                <h3><?php _e('This Month', 'pdf-stats-tracker'); ?></h3>
                <table class="widefat">
                    <thead>
                        <tr>
                            <th><?php _e('Action', 'pdf-stats-tracker'); ?></th>
                            <th><?php _e('Count', 'pdf-stats-tracker'); ?></th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td><?php _e('PDF Views', 'pdf-stats-tracker'); ?></td>
                            <td><?php echo intval($month_views); ?></td>
                        </tr>
                        <tr>
                            <td><?php _e('PDF Downloads', 'pdf-stats-tracker'); ?></td>
                            <td><?php echo intval($month_downloads); ?></td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    </div>
    
    <div class="pdf-stats-top-files">
        <div class="pdf-stats-row">
            <!-- Top PDFs by Views -->
            <div class="pdf-stats-column">
                <h2><?php _e('Top PDFs by Views', 'pdf-stats-tracker'); ?></h2>
                
                <?php if (empty($top_pdfs_views)) : ?>
                    <p><?php _e('No data available yet.', 'pdf-stats-tracker'); ?></p>
                <?php else : ?>
                    <table class="widefat striped">
                        <thead>
                            <tr>
                                <th><?php _e('PDF File', 'pdf-stats-tracker'); ?></th>
                                <th><?php _e('Views', 'pdf-stats-tracker'); ?></th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php foreach ($top_pdfs_views as $pdf) : ?>
                                <tr>
                                    <td>
                                        <?php 
                                        $filename = basename($pdf->pdf_url);
                                        echo esc_html($filename); 
                                        ?>
                                        <br>
                                        <small>
                                            <a href="<?php echo esc_url($pdf->pdf_url); ?>" target="_blank">
                                                <?php _e('View PDF', 'pdf-stats-tracker'); ?>
                                            </a>
                                        </small>
                                    </td>
                                    <td><?php echo intval($pdf->count); ?></td>
                                </tr>
                            <?php endforeach; ?>
                        </tbody>
                    </table>
                <?php endif; ?>
            </div>
            
            <!-- Top PDFs by Downloads -->
            <div class="pdf-stats-column">
                <h2><?php _e('Top PDFs by Downloads', 'pdf-stats-tracker'); ?></h2>
                
                <?php if (empty($top_pdfs_downloads)) : ?>
                    <p><?php _e('No data available yet.', 'pdf-stats-tracker'); ?></p>
                <?php else : ?>
                    <table class="widefat striped">
                        <thead>
                            <tr>
                                <th><?php _e('PDF File', 'pdf-stats-tracker'); ?></th>
                                <th><?php _e('Downloads', 'pdf-stats-tracker'); ?></th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php foreach ($top_pdfs_downloads as $pdf) : ?>
                                <tr>
                                    <td>
                                        <?php 
                                        $filename = basename($pdf->pdf_url);
                                        echo esc_html($filename); 
                                        ?>
                                        <br>
                                        <small>
                                            <a href="<?php echo esc_url($pdf->pdf_url); ?>" target="_blank">
                                                <?php _e('View PDF', 'pdf-stats-tracker'); ?>
                                            </a>
                                        </small>
                                    </td>
                                    <td><?php echo intval($pdf->count); ?></td>
                                </tr>
                            <?php endforeach; ?>
                        </tbody>
                    </table>
                <?php endif; ?>
            </div>
        </div>
    </div>
</div>

<style>
    .pdf-stats-boxes {
        display: flex;
        flex-wrap: wrap;
        gap: 20px;
        margin-bottom: 30px;
    }
    
    .pdf-stats-box {
        flex: 1;
        min-width: 250px;
        margin-bottom: 20px;
    }
    
    .pdf-stats-row {
        display: flex;
        flex-wrap: wrap;
        gap: 30px;
    }
    
    .pdf-stats-column {
        flex: 1;
        min-width: 300px;
    }
    
    @media screen and (max-width: 782px) {
        .pdf-stats-row,
        .pdf-stats-boxes {
            flex-direction: column;
        }
    }
</style>