<?php
/**
 * GSD Atlas Theme Functions
 * Theme specifically designed for GSD Atlas WordPress integration
 */

// Theme setup
function gsd_atlas_theme_setup() {
    // Add theme support
    add_theme_support('title-tag');
    add_theme_support('post-thumbnails');
    add_theme_support('html5', array(
        'search-form',
        'comment-form',
        'comment-list',
        'gallery',
        'caption',
    ));
    
    // Register navigation menus
    register_nav_menus(array(
        'primary' => __('Primary Menu', 'gsd-atlas'),
        'footer' => __('Footer Menu', 'gsd-atlas'),
        'breeder-tools' => __('Breeder Tools Menu', 'gsd-atlas'),
    ));
    
    // Load text domain
    load_theme_textdomain('gsd-atlas', get_template_directory() . '/languages');
}
add_action('after_setup_theme', 'gsd_atlas_theme_setup');

// Enqueue scripts and styles
function gsd_atlas_theme_scripts() {
    // Theme stylesheet
    wp_enqueue_style('gsd-atlas-theme', get_stylesheet_uri(), array(), '1.0.0');
    
    // Theme JavaScript
    wp_enqueue_script('gsd-atlas-theme-js', get_template_directory_uri() . '/js/theme.js', array('jquery'), '1.0.0', true);
    
    // Localize script
    wp_localize_script('gsd-atlas-theme-js', 'gsdAtlasTheme', array(
        'ajaxUrl' => admin_url('admin-ajax.php'),
        'nonce' => wp_create_nonce('gsd_atlas_theme_nonce'),
    ));
}
add_action('wp_enqueue_scripts', 'gsd_atlas_theme_scripts');

// Register widget areas
function gsd_atlas_theme_widgets_init() {
    register_sidebar(array(
        'name' => __('Primary Sidebar', 'gsd-atlas'),
        'id' => 'sidebar-1',
        'description' => __('Main sidebar for blog and pages', 'gsd-atlas'),
        'before_widget' => '<div id="%1$s" class="widget %2$s">',
        'after_widget' => '</div>',
        'before_title' => '<h3 class="widget-title">',
        'after_title' => '</h3>',
    ));
    
    register_sidebar(array(
        'name' => __('Dog Search Sidebar', 'gsd-atlas'),
        'id' => 'dog-search-sidebar',
        'description' => __('Sidebar for dog search pages', 'gsd-atlas'),
        'before_widget' => '<div id="%1$s" class="widget %2$s">',
        'after_widget' => '</div>',
        'before_title' => '<h3 class="widget-title">',
        'after_title' => '</h3>',
    ));
    
    register_sidebar(array(
        'name' => __('Footer Widget Area 1', 'gsd-atlas'),
        'id' => 'footer-1',
        'description' => __('Footer widget area 1', 'gsd-atlas'),
        'before_widget' => '<div id="%1$s" class="widget %2$s">',
        'after_widget' => '</div>',
        'before_title' => '<h3 class="widget-title">',
        'after_title' => '</h3>',
    ));
    
    register_sidebar(array(
        'name' => __('Footer Widget Area 2', 'gsd-atlas'),
        'id' => 'footer-2',
        'description' => __('Footer widget area 2', 'gsd-atlas'),
        'before_widget' => '<div id="%1$s" class="widget %2$s">',
        'after_widget' => '</div>',
        'before_title' => '<h3 class="widget-title">',
        'after_title' => '</h3>',
    ));
    
    register_sidebar(array(
        'name' => __('Footer Widget Area 3', 'gsd-atlas'),
        'id' => 'footer-3',
        'description' => __('Footer widget area 3', 'gsd-atlas'),
        'before_widget' => '<div id="%1$s" class="widget %2$s">',
        'after_widget' => '</div>',
        'before_title' => '<h3 class="widget-title">',
        'after_title' => '</h3>',
    ));
}
add_action('widgets_init', 'gsd_atlas_theme_widgets_init');

// Custom post types for enhanced functionality
function gsd_atlas_custom_post_types() {
    // Featured Dogs post type
    register_post_type('featured_dog', array(
        'labels' => array(
            'name' => __('Featured Dogs', 'gsd-atlas'),
            'singular_name' => __('Featured Dog', 'gsd-atlas'),
            'add_new' => __('Add New', 'gsd-atlas'),
            'add_new_item' => __('Add New Featured Dog', 'gsd-atlas'),
            'edit_item' => __('Edit Featured Dog', 'gsd-atlas'),
            'new_item' => __('New Featured Dog', 'gsd-atlas'),
            'view_item' => __('View Featured Dog', 'gsd-atlas'),
            'search_items' => __('Search Featured Dogs', 'gsd-atlas'),
            'not_found' => __('No featured dogs found', 'gsd-atlas'),
            'not_found_in_trash' => __('No featured dogs found in trash', 'gsd-atlas'),
            'parent_item_colon' => __('Parent Featured Dog:', 'gsd-atlas'),
            'menu_name' => __('Featured Dogs', 'gsd-atlas'),
        ),
        'public' => true,
        'has_archive' => true,
        'publicly_queryable' => true,
        'show_ui' => true,
        'show_in_menu' => true,
        'query_var' => true,
        'rewrite' => array('slug' => 'featured-dogs'),
        'capability_type' => 'post',
        'hierarchical' => false,
        'menu_position' => 5,
        'menu_icon' => 'dashicons-pets',
        'supports' => array('title', 'editor', 'excerpt', 'thumbnail', 'custom-fields'),
    ));
    
    // Breeder Stories post type
    register_post_type('breeder_story', array(
        'labels' => array(
            'name' => __('Breeder Stories', 'gsd-atlas'),
            'singular_name' => __('Breeder Story', 'gsd-atlas'),
            'add_new' => __('Add New', 'gsd-atlas'),
            'add_new_item' => __('Add New Breeder Story', 'gsd-atlas'),
            'edit_item' => __('Edit Breeder Story', 'gsd-atlas'),
            'new_item' => __('New Breeder Story', 'gsd-atlas'),
            'view_item' => __('View Breeder Story', 'gsd-atlas'),
            'search_items' => __('Search Breeder Stories', 'gsd-atlas'),
            'not_found' => __('No breeder stories found', 'gsd-atlas'),
            'not_found_in_trash' => __('No breeder stories found in trash', 'gsd-atlas'),
            'parent_item_colon' => __('Parent Breeder Story:', 'gsd-atlas'),
            'menu_name' => __('Breeder Stories', 'gsd-atlas'),
        ),
        'public' => true,
        'has_archive' => true,
        'publicly_queryable' => true,
        'show_ui' => true,
        'show_in_menu' => true,
        'query_var' => true,
        'rewrite' => array('slug' => 'breeder-stories'),
        'capability_type' => 'post',
        'hierarchical' => false,
        'menu_position' => 6,
        'menu_icon' => 'dashicons-book',
        'supports' => array('title', 'editor', 'excerpt', 'thumbnail', 'author'),
    ));
}
add_action('init', 'gsd_atlas_custom_post_types');

// Custom taxonomies
function gsd_atlas_custom_taxonomies() {
    // Bloodline taxonomy
    register_taxonomy('bloodline', array('featured_dog'), array(
        'labels' => array(
            'name' => __('Bloodlines', 'gsd-atlas'),
            'singular_name' => __('Bloodline', 'gsd-atlas'),
            'search_items' => __('Search Bloodlines', 'gsd-atlas'),
            'all_items' => __('All Bloodlines', 'gsd-atlas'),
            'parent_item' => __('Parent Bloodline', 'gsd-atlas'),
            'parent_item_colon' => __('Parent Bloodline:', 'gsd-atlas'),
            'edit_item' => __('Edit Bloodline', 'gsd-atlas'),
            'update_item' => __('Update Bloodline', 'gsd-atlas'),
            'add_new_item' => __('Add New Bloodline', 'gsd-atlas'),
            'new_item_name' => __('New Bloodline Name', 'gsd-atlas'),
            'menu_name' => __('Bloodlines', 'gsd-atlas'),
        ),
        'hierarchical' => true,
        'public' => true,
        'show_ui' => true,
        'show_admin_column' => true,
        'query_var' => true,
        'rewrite' => array('slug' => 'bloodline'),
    ));
    
    // Working Title taxonomy
    register_taxonomy('working_title', array('featured_dog'), array(
        'labels' => array(
            'name' => __('Working Titles', 'gsd-atlas'),
            'singular_name' => __('Working Title', 'gsd-atlas'),
            'search_items' => __('Search Working Titles', 'gsd-atlas'),
            'all_items' => __('All Working Titles', 'gsd-atlas'),
            'parent_item' => __('Parent Working Title', 'gsd-atlas'),
            'parent_item_colon' => __('Parent Working Title:', 'gsd-atlas'),
            'edit_item' => __('Edit Working Title', 'gsd-atlas'),
            'update_item' => __('Update Working Title', 'gsd-atlas'),
            'add_new_item' => __('Add New Working Title', 'gsd-atlas'),
            'new_item_name' => __('New Working Title Name', 'gsd-atlas'),
            'menu_name' => __('Working Titles', 'gsd-atlas'),
        ),
        'hierarchical' => false,
        'public' => true,
        'show_ui' => true,
        'show_admin_column' => true,
        'query_var' => true,
        'rewrite' => array('slug' => 'working-title'),
    ));
}
add_action('init', 'gsd_atlas_custom_taxonomies');

// Custom template includes
function gsd_atlas_template_include($template) {
    // Handle dog profile display
    if (get_query_var('gsd_dog')) {
        $new_template = locate_template(array('dog-profile.php', 'page.php'));
        if (!empty($new_template)) {
            return $new_template;
        }
    }
    
    return $template;
}
add_filter('template_include', 'gsd_atlas_template_include');

// Add query vars for dog profiles
function gsd_atlas_query_vars($query_vars) {
    $query_vars[] = 'gsd_dog';
    return $query_vars;
}
add_filter('query_vars', 'gsd_atlas_query_vars');

// Custom excerpt length
function gsd_atlas_excerpt_length($length) {
    return 30;
}
add_filter('excerpt_length', 'gsd_atlas_excerpt_length');

// Custom excerpt more
function gsd_atlas_excerpt_more($more) {
    return '... <a href="' . get_permalink() . '">' . __('Read More', 'gsd-atlas') . '</a>';
}
add_filter('excerpt_more', 'gsd_atlas_excerpt_more');

// Theme customizer settings
function gsd_atlas_theme_customizer($wp_customize) {
    // Header color
    $wp_customize->add_setting('header_color', array(
        'default' => '#0073aa',
        'sanitize_callback' => 'sanitize_hex_color',
    ));
    
    $wp_customize->add_control(new WP_Customize_Color_Control($wp_customize, 'header_color', array(
        'label' => __('Header Color', 'gsd-atlas'),
        'section' => 'colors',
        'settings' => 'header_color',
    )));
    
    // Accent color
    $wp_customize->add_setting('accent_color', array(
        'default' => '#46b450',
        'sanitize_callback' => 'sanitize_hex_color',
    ));
    
    $wp_customize->add_control(new WP_Customize_Color_Control($wp_customize, 'accent_color', array(
        'label' => __('Accent Color', 'gsd-atlas'),
        'section' => 'colors',
        'settings' => 'accent_color',
    )));
    
    // Show/hide featured dogs section
    $wp_customize->add_setting('show_featured_dogs', array(
        'default' => true,
        'sanitize_callback' => 'wp_validate_boolean',
    ));
    
    $wp_customize->add_control('show_featured_dogs', array(
        'label' => __('Show Featured Dogs Section', 'gsd-atlas'),
        'section' => 'static_front_page',
        'type' => 'checkbox',
    ));
}
add_action('customize_register', 'gsd_atlas_theme_customizer');

// Breadcrumb navigation
function gsd_atlas_breadcrumbs() {
    if (function_exists('yoast_breadcrumb')) {
        yoast_breadcrumb('<p id="breadcrumbs">', '</p>');
    } else {
        // Fallback breadcrumb
        echo '<p id="breadcrumbs">';
        echo '<a href="' . home_url() . '">' . __('Home', 'gsd-atlas') . '</a> ';
        
        if (is_category() || is_single()) {
            the_category(' ');
            if (is_single()) {
                echo ' » ';
                the_title();
            }
        } elseif (is_page()) {
            echo the_title();
        }
        
        echo '</p>';
    }
}

// Pagination function
function gsd_atlas_pagination() {
    global $wp_query;
    
    if ($wp_query->max_num_pages <= 1) {
        return;
    }
    
    $args = array(
        'mid_size' => 2,
        'prev_text' => __('« Previous', 'gsd-atlas'),
        'next_text' => __('Next »', 'gsd-atlas'),
        'screen_reader_text' => __('Posts navigation', 'gsd-atlas'),
        'type' => 'array',
        'current' => max(1, get_query_var('paged')),
    );
    
    $links = paginate_links($args);
    
    if (!empty($links)) {
        echo '<nav class="navigation pagination" role="navigation">';
        echo '<div class="nav-links">';
        foreach ($links as $link) {
            echo $link;
        }
        echo '</div>';
        echo '</nav>';
    }
}

// Get featured dogs for homepage
function gsd_atlas_get_featured_dogs($count = 6) {
    $args = array(
        'post_type' => 'featured_dog',
        'posts_per_page' => $count,
        'post_status' => 'publish',
        'orderby' => 'date',
        'order' => 'DESC',
    );
    
    return new WP_Query($args);
}

// Get breeder stories
function gsd_atlas_get_breeder_stories($count = 3) {
    $args = array(
        'post_type' => 'breeder_story',
        'posts_per_page' => $count,
        'post_status' => 'publish',
        'orderby' => 'date',
        'order' => 'DESC',
    );
    
    return new WP_Query($args);
}

// AJAX handlers
add_action('wp_ajax_gsd_atlas_load_more_dogs', 'gsd_atlas_load_more_dogs_handler');
add_action('wp_ajax_nopriv_gsd_atlas_load_more_dogs', 'gsd_atlas_load_more_dogs_handler');

function gsd_atlas_load_more_dogs_handler() {
    check_ajax_referer('gsd_atlas_theme_nonce', 'nonce');
    
    $page = intval($_POST['page']);
    $search = sanitize_text_field($_POST['search'] ?? '');
    $sex = sanitize_text_field($_POST['sex'] ?? '');
    
    // Use the GSD Atlas API to get dogs
    if (class_exists('GSD_Atlas_API')) {
        $api = new GSD_Atlas_API();
        $params = array('page' => $page, 'per_page' => 12);
        
        if (!empty($search)) {
            $params['search'] = $search;
        }
        
        if (!empty($sex)) {
            $params['sex'] = $sex;
        }
        
        $dogs = $api->get_dogs($params);
        
        if (!isset($dogs['error']) && !empty($dogs['data'])) {
            ob_start();
            foreach ($dogs['data'] as $dog) {
                include get_template_directory() . '/template-parts/dog-card.php';
            }
            $html = ob_get_clean();
            
            wp_send_json_success(array(
                'html' => $html,
                'has_more' => isset($dogs['pagination']) && $dogs['pagination']['page'] < $dogs['pagination']['totalPages'],
            ));
        }
    }
    
    wp_send_json_error();
}
?>
