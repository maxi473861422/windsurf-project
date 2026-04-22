<?php
/**
 * Plugin Name: GSD Atlas - German Shepherd Database
 * Plugin URI: https://gsd-atlas.com
 * Description: Integrates GSD Atlas database with WordPress for German Shepherd Dog genealogy and breeding management.
 * Version: 1.0.0
 * Author: GSD Atlas Team
 * License: GPL v2 or later
 * Text Domain: gsd-atlas
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

// Define plugin constants
define('GSD_ATLAS_VERSION', '1.0.0');
define('GSD_ATLAS_API_URL', get_option('gsd_atlas_api_url', 'http://localhost:3001'));
define('GSD_ATLAS_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('GSD_ATLAS_PLUGIN_URL', plugin_dir_url(__FILE__));

// Include required files
require_once GSD_ATLAS_PLUGIN_DIR . 'includes/class-gsd-atlas-api.php';
require_once GSD_ATLAS_PLUGIN_DIR . 'includes/class-gsd-atlas-shortcodes.php';
require_once GSD_ATLAS_PLUGIN_DIR . 'includes/class-gsd-atlas-admin.php';
require_once GSD_ATLAS_PLUGIN_DIR . 'includes/class-gsd-atlas-widgets.php';

// Initialize plugin
class GSD_Atlas_Plugin {
    private $api;
    private $shortcodes;
    private $admin;
    private $widgets;

    public function __construct() {
        add_action('init', array($this, 'init'));
        register_activation_hook(__FILE__, array($this, 'activate'));
        register_deactivation_hook(__FILE__, array($this, 'deactivate'));
    }

    public function init() {
        $this->api = new GSD_Atlas_API();
        $this->shortcodes = new GSD_Atlas_Shortcodes($this->api);
        $this->admin = new GSD_Atlas_Admin();
        $this->widgets = new GSD_Atlas_Widgets($this->api);

        // Load text domain
        load_plugin_textdomain('gsd-atlas', false, dirname(plugin_basename(__FILE__)) . '/languages');

        // Enqueue scripts and styles
        add_action('wp_enqueue_scripts', array($this, 'enqueue_frontend_scripts'));
        add_action('admin_enqueue_scripts', array($this, 'enqueue_admin_scripts'));
    }

    public function enqueue_frontend_scripts() {
        wp_enqueue_style('gsd-atlas-frontend', GSD_ATLAS_PLUGIN_URL . 'assets/css/frontend.css', array(), GSD_ATLAS_VERSION);
        wp_enqueue_script('gsd-atlas-frontend', GSD_ATLAS_PLUGIN_URL . 'assets/js/frontend.js', array('jquery'), GSD_ATLAS_VERSION, true);
        
        // Localize script
        wp_localize_script('gsd-atlas-frontend', 'gsdAtlas', array(
            'apiUrl' => GSD_ATLAS_API_URL,
            'ajaxUrl' => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce('gsd_atlas_nonce'),
            'strings' => array(
                'loading' => __('Loading...', 'gsd-atlas'),
                'error' => __('Error loading data', 'gsd-atlas'),
                'no_results' => __('No results found', 'gsd-atlas'),
            ),
        ));
    }

    public function enqueue_admin_scripts() {
        wp_enqueue_style('gsd-atlas-admin', GSD_ATLAS_PLUGIN_URL . 'assets/css/admin.css', array(), GSD_ATLAS_VERSION);
        wp_enqueue_script('gsd-atlas-admin', GSD_ATLAS_PLUGIN_URL . 'assets/js/admin.js', array('jquery'), GSD_ATLAS_VERSION, true);
    }

    public function activate() {
        // Create custom tables if needed
        $this->create_tables();
        
        // Set default options
        add_option('gsd_atlas_api_url', 'http://localhost:3001');
        add_option('gsd_atlas_cache_duration', 3600); // 1 hour
        add_option('gsd_atlas_enable_caching', 1);
        
        // Flush rewrite rules
        flush_rewrite_rules();
    }

    public function deactivate() {
        // Flush rewrite rules
        flush_rewrite_rules();
    }

    private function create_tables() {
        global $wpdb;
        
        $table_name = $wpdb->prefix . 'gsd_atlas_cache';
        $charset_collate = $wpdb->get_charset_collate();

        $sql = "CREATE TABLE $table_name (
            id mediumint(9) NOT NULL AUTO_INCREMENT,
            cache_key varchar(255) NOT NULL,
            cache_value longtext NOT NULL,
            cache_expires bigint(20) NOT NULL,
            created_at datetime DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY  (id),
            UNIQUE KEY cache_key (cache_key),
            KEY cache_expires (cache_expires)
        ) $charset_collate;";

        require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
        dbDelta($sql);
    }
}

// Initialize the plugin
new GSD_Atlas_Plugin();

// AJAX handlers
add_action('wp_ajax_gsd_atlas_search', 'gsd_atlas_ajax_search');
add_action('wp_ajax_nopriv_gsd_atlas_search', 'gsd_atlas_ajax_search');

function gsd_atlas_ajax_search() {
    check_ajax_referer('gsd_atlas_nonce', 'nonce');
    
    $query = sanitize_text_field($_POST['query']);
    $type = sanitize_text_field($_POST['type'] ?? 'all');
    
    $api = new GSD_Atlas_API();
    $results = $api->search($query, $type);
    
    wp_send_json_success($results);
}

// REST API integration
add_action('rest_api_init', function () {
    register_rest_route('gsd-atlas/v1', '/dogs', array(
        'methods' => 'GET',
        'callback' => 'gsd_atlas_rest_dogs',
        'permission_callback' => '__return_true',
    ));
    
    register_rest_route('gsd-atlas/v1', '/dogs/(?P<id>\w+)', array(
        'methods' => 'GET',
        'callback' => 'gsd_atlas_rest_dog',
        'permission_callback' => '__return_true',
    ));
    
    register_rest_route('gsd-atlas/v1', '/pedigree/(?P<id>\w+)', array(
        'methods' => 'GET',
        'callback' => 'gsd_atlas_rest_pedigree',
        'permission_callback' => '__return_true',
    ));
});

function gsd_atlas_rest_dogs($request) {
    $api = new GSD_Atlas_API();
    $params = $request->get_params();
    
    return $api->get_dogs($params);
}

function gsd_atlas_rest_dog($request) {
    $api = new GSD_Atlas_API();
    $dog_id = $request['id'];
    
    return $api->get_dog($dog_id);
}

function gsd_atlas_rest_pedigree($request) {
    $api = new GSD_Atlas_API();
    $dog_id = $request['id'];
    $generations = $request['generations'] ?? 5;
    
    return $api->get_pedigree($dog_id, $generations);
}
?>
