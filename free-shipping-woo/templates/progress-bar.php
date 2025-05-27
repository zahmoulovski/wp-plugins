<?php
/**
 * Progress bar template
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

if (!isset($progress_data)) {
    return;
}

$percentage = $progress_data['percentage'];
$message = $progress_data['message'];
$remaining = $progress_data['remaining'];
$qualified = $progress_data['qualified'];
?>

<div class="fspb-progress-container" data-threshold="<?php echo esc_attr($progress_data['threshold']); ?>">
    <div class="fspb-message <?php echo $qualified ? 'qualified' : ''; ?>">
        <?php echo wp_kses_post($message); ?>
    </div>
    
    <div class="fspb-progress-wrapper">
        <div class="fspb-progress-bar <?php echo $qualified ? 'qualified' : ''; ?>" 
             style="width: <?php echo esc_attr($percentage); ?>%"
             role="progressbar"
             aria-valuenow="<?php echo esc_attr(round($percentage)); ?>"
             aria-valuemin="0"
             aria-valuemax="100"
             aria-label="<?php echo esc_attr__('Free shipping progress', 'free-shipping-progress-bar'); ?>">
            <div class="fspb-progress-text">
                <?php echo esc_html(round($percentage)); ?>%
            </div>
        </div>
    </div>
    
    <?php if ($remaining > 0) : ?>
        <div class="fspb-remaining-amount">
            <?php 
            printf(
                esc_html__('Remaining: %s', 'free-shipping-progress-bar'),
                wc_price($remaining)
            );
            ?>
        </div>
    <?php endif; ?>
</div>
