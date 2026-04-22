<?php
/**
 * GSD Atlas Admin Class
 * Handles admin interface and settings
 */

if (!defined('ABSPATH')) {
    exit;
}

class GSD_Atlas_Admin {
    public function __construct() {
        add_action('admin_menu', array($this, 'add_admin_menu'));
        add_action('admin_init', array($this, 'register_settings'));
        add_action('admin_notices', array($this, 'admin_notices'));
    }

    /**
     * Add admin menu items
     */
    public function add_admin_menu() {
        add_menu_page(
            __('GSD Atlas', 'gsd-atlas'),
            __('GSD Atlas', 'gsd-atlas'),
            'manage_options',
            'gsd-atlas',
            array($this, 'admin_dashboard'),
            'dashicons-pets',
            25
        );

        add_submenu_page(
            'gsd-atlas',
            __('Dashboard', 'gsd-atlas'),
            __('Dashboard', 'gsd-atlas'),
            'manage_options',
            'gsd-atlas',
            array($this, 'admin_dashboard')
        );

        add_submenu_page(
            'gsd-atlas',
            __('Settings', 'gsd-atlas'),
            __('Settings', 'gsd-atlas'),
            'manage_options',
            'gsd-atlas-settings',
            array($this, 'admin_settings')
        );

        add_submenu_page(
            'gsd-atlas',
            __('Statistics', 'gsd-atlas'),
            __('Statistics', 'gsd-atlas'),
            'manage_options',
            'gsd-atlas-statistics',
            array($this, 'admin_statistics')
        );
    }

    /**
     * Register settings
     */
    public function register_settings() {
        register_setting('gsd_atlas_settings', 'gsd_atlas_api_url');
        register_setting('gsd_atlas_settings', 'gsd_atlas_cache_duration');
        register_setting('gsd_atlas_settings', 'gsd_atlas_enable_caching');
    }

    /**
     * Admin dashboard
     */
    public function admin_dashboard() {
        $api = new GSD_Atlas_API();
        $stats = $api->get_statistics();
        ?>
        <div class="wrap">
            <h1><?php _e('GSD Atlas Dashboard', 'gsd-atlas'); ?></h1>
            
            <div class="gsd-admin-welcome">
                <p><?php _e('Welcome to GSD Atlas - the comprehensive German Shepherd Dog database integration for WordPress.', 'gsd-atlas'); ?></p>
            </div>

            <div class="gsd-admin-stats">
                <h2><?php _e('Overview', 'gsd-atlas'); ?></h2>
                <div class="gsd-stats-grid">
                    <div class="gsd-stat-card">
                        <div class="gsd-stat-number"><?php echo number_format($stats['total_dogs'] ?? 0); ?></div>
                        <div class="gsd-stat-label"><?php _e('Total Dogs', 'gsd-atlas'); ?></div>
                    </div>
                    <div class="gsd-stat-card">
                        <div class="gsd-stat-number"><?php echo count($stats['recent_dogs'] ?? array()); ?></div>
                        <div class="gsd-stat-label"><?php _e('Recent Additions', 'gsd-atlas'); ?></div>
                    </div>
                </div>
            </div>

            <div class="gsd-admin-shortcodes">
                <h2><?php _e('Available Shortcodes', 'gsd-atlas'); ?></h2>
                <div class="gsd-shortcode-list">
                    <div class="gsd-shortcode-item">
                        <h3>[gsd_dog_search]</h3>
                        <p><?php _e('Display a dog search form', 'gsd-atlas'); ?></p>
                        <code>[gsd_dog_search placeholder="Search dogs..." type="all"]</code>
                    </div>
                    <div class="gsd-shortcode-item">
                        <h3>[gsd_dog_profile]</h3>
                        <p><?php _e('Display a detailed dog profile', 'gsd-atlas'); ?></p>
                        <code>[gsd_dog_profile id="dog-id" show_pedigree="true"]</code>
                    </div>
                    <div class="gsd-shortcode-item">
                        <h3>[gsd_pedigree]</h3>
                        <p><?php _e('Display a pedigree tree', 'gsd-atlas'); ?></p>
                        <code>[gsd_pedigree id="dog-id" generations="5"]</code>
                    </div>
                    <div class="gsd-shortcode-item">
                        <h3>[gsd_breeding_simulator]</h3>
                        <p><?php _e('Display a breeding simulator', 'gsd-atlas'); ?></p>
                        <code>[gsd_breeding_simulator]</code>
                    </div>
                    <div class="gsd-shortcode-item">
                        <h3>[gsd_dogs_list]</h3>
                        <p><?php _e('Display a list of dogs', 'gsd-atlas'); ?></p>
                        <code>[gsd_dogs_list limit="10" sex="MALE"]</code>
                    </div>
                    <div class="gsd-shortcode-item">
                        <h3>[gsd_statistics]</h3>
                        <p><?php _e('Display database statistics', 'gsd-atlas'); ?></p>
                        <code>[gsd_statistics]</code>
                    </div>
                </div>
            </div>

            <div class="gsd-admin-help">
                <h2><?php _e('Help & Documentation', 'gsd-atlas'); ?></h2>
                <p><?php _e('For detailed documentation and support, please visit our website or contact our support team.', 'gsd-atlas'); ?></p>
            </div>
        </div>
        <?php
    }

    /**
     * Admin settings page
     */
    public function admin_settings() {
        ?>
        <div class="wrap">
            <h1><?php _e('GSD Atlas Settings', 'gsd-atlas'); ?></h1>
            
            <form method="post" action="options.php">
                <?php
                settings_fields('gsd_atlas_settings');
                do_settings_sections('gsd_atlas_settings');
                ?>

                <table class="form-table">
                    <tr>
                        <th scope="row">
                            <label for="gsd_atlas_api_url"><?php _e('API URL', 'gsd-atlas'); ?></label>
                        </th>
                        <td>
                            <input type="url" id="gsd_atlas_api_url" name="gsd_atlas_api_url" 
                                   value="<?php echo esc_attr(get_option('gsd_atlas_api_url', 'http://localhost:3001')); ?>" 
                                   class="regular-text" />
                            <p class="description">
                                <?php _e('The URL of your GSD Atlas API server', 'gsd-atlas'); ?>
                            </p>
                        </td>
                    </tr>
                    
                    <tr>
                        <th scope="row">
                            <label for="gsd_atlas_enable_caching"><?php _e('Enable Caching', 'gsd-atlas'); ?></label>
                        </th>
                        <td>
                            <input type="checkbox" id="gsd_atlas_enable_caching" name="gsd_atlas_enable_caching" 
                                   value="1" <?php checked(get_option('gsd_atlas_enable_caching', 1)); ?> />
                            <p class="description">
                                <?php _e('Enable caching to improve performance and reduce API calls', 'gsd-atlas'); ?>
                            </p>
                        </td>
                    </tr>
                    
                    <tr>
                        <th scope="row">
                            <label for="gsd_atlas_cache_duration"><?php _e('Cache Duration (seconds)', 'gsd-atlas'); ?></label>
                        </th>
                        <td>
                            <input type="number" id="gsd_atlas_cache_duration" name="gsd_atlas_cache_duration" 
                                   value="<?php echo esc_attr(get_option('gsd_atlas_cache_duration', 3600)); ?>" 
                                   class="small-text" min="60" />
                            <p class="description">
                                <?php _e('How long to cache API responses (default: 3600 seconds = 1 hour)', 'gsd-atlas'); ?>
                            </p>
                        </td>
                    </tr>
                </table>

                <?php submit_button(__('Save Settings', 'gsd-atlas')); ?>
            </form>

            <div class="gsd-admin-actions">
                <h2><?php _e('Cache Management', 'gsd-atlas'); ?></h2>
                <p>
                    <button type="button" id="gsd-clear-cache" class="button button-secondary">
                        <?php _e('Clear All Cache', 'gsd-atlas'); ?>
                    </button>
                    <span class="spinner" id="gsd-cache-spinner" style="display: none;"></span>
                </p>
            </div>
        </div>

        <script>
        jQuery(document).ready(function($) {
            $('#gsd-clear-cache').on('click', function() {
                if (confirm('<?php _e('Are you sure you want to clear all cached data?', 'gsd-atlas'); ?>')) {
                    $('#gsd-cache-spinner').show();
                    
                    $.ajax({
                        url: ajaxurl,
                        type: 'POST',
                        data: {
                            action: 'gsd_atlas_clear_cache',
                            nonce: '<?php echo wp_create_nonce('gsd_atlas_clear_cache'); ?>'
                        },
                        success: function(response) {
                            $('#gsd-cache-spinner').hide();
                            if (response.success) {
                                alert('<?php _e('Cache cleared successfully!', 'gsd-atlas'); ?>');
                            } else {
                                alert('<?php _e('Error clearing cache. Please try again.', 'gsd-atlas'); ?>');
                            }
                        },
                        error: function() {
                            $('#gsd-cache-spinner').hide();
                            alert('<?php _e('Error clearing cache. Please try again.', 'gsd-atlas'); ?>');
                        }
                    });
                }
            });
        });
        </script>
        <?php
    }

    /**
     * Admin statistics page
     */
    public function admin_statistics() {
        $api = new GSD_Atlas_API();
        $stats = $api->get_statistics();
        ?>
        <div class="wrap">
            <h1><?php _e('GSD Atlas Statistics', 'gsd-atlas'); ?></h1>
            
            <div class="gsd-stats-overview">
                <div class="gsd-stat-card">
                    <div class="gsd-stat-number"><?php echo number_format($stats['total_dogs'] ?? 0); ?></div>
                    <div class="gsd-stat-label"><?php _e('Total Dogs', 'gsd-atlas'); ?></div>
                </div>
                <div class="gsd-stat-card">
                    <div class="gsd-stat-number"><?php echo count($stats['recent_dogs'] ?? array()); ?></div>
                    <div class="gsd-stat-label"><?php _e('Recent Additions', 'gsd-atlas'); ?></div>
                </div>
            </div>

            <?php if (!empty($stats['recent_dogs'])): ?>
                <div class="gsd-recent-dogs">
                    <h2><?php _e('Recently Added Dogs', 'gsd-atlas'); ?></h2>
                    <table class="wp-list-table widefat fixed striped">
                        <thead>
                            <tr>
                                <th><?php _e('Name', 'gsd-atlas'); ?></th>
                                <th><?php _e('Registration', 'gsd-atlas'); ?></th>
                                <th><?php _e('Sex', 'gsd-atlas'); ?></th>
                                <th><?php _e('Birth Date', 'gsd-atlas'); ?></th>
                                <th><?php _e('Actions', 'gsd-atlas'); ?></th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php foreach ($stats['recent_dogs'] as $dog): ?>
                                <tr>
                                    <td>
                                        <strong><?php echo esc_html($dog['title']['rendered']); ?></strong>
                                    </td>
                                    <td><?php echo esc_html($dog['meta']['registration_number'] ?? 'N/A'); ?></td>
                                    <td><?php echo esc_html($dog['meta']['sex']); ?></td>
                                    <td>
                                        <?php 
                                        if (!empty($dog['meta']['birth_date'])) {
                                            echo date('Y-m-d', strtotime($dog['meta']['birth_date']));
                                        } else {
                                            echo 'N/A';
                                        }
                                        ?>
                                    </td>
                                    <td>
                                        <a href="?gsd_dog=<?php echo esc_attr($dog['id']); ?>" class="button button-small">
                                            <?php _e('View Profile', 'gsd-atlas'); ?>
                                        </a>
                                    </td>
                                </tr>
                            <?php endforeach; ?>
                        </tbody>
                    </table>
                </div>
            <?php endif; ?>
        </div>
        <?php
    }

    /**
     * Admin notices
     */
    public function admin_notices() {
        // Check if API URL is configured
        $api_url = get_option('gsd_atlas_api_url');
        if (empty($api_url)) {
            ?>
            <div class="notice notice-warning">
                <p>
                    <?php _e('GSD Atlas: Please configure the API URL in the plugin settings.', 'gsd-atlas'); ?>
                    <a href="<?php echo admin_url('admin.php?page=gsd-atlas-settings'); ?>">
                        <?php _e('Configure Now', 'gsd-atlas'); ?>
                    </a>
                </p>
            </div>
            <?php
        }
    }
}

// AJAX handler for clearing cache
add_action('wp_ajax_gsd_atlas_clear_cache', 'gsd_atlas_clear_cache_handler');

function gsd_atlas_clear_cache_handler() {
    check_ajax_referer('gsd_atlas_clear_cache', 'nonce');
    
    if (!current_user_can('manage_options')) {
        wp_die(__('You do not have sufficient permissions to access this page.', 'gsd-atlas'));
    }
    
    $api = new GSD_Atlas_API();
    $api->clear_cache();
    
    wp_send_json_success();
}
?>
