<?php
/**
 * GSD Atlas Widgets Class
 * Defines WordPress widgets for GSD Atlas integration
 */

if (!defined('ABSPATH')) {
    exit;
}

class GSD_Atlas_Widgets {
    private $api;

    public function __construct($api) {
        $this->api = $api;
        
        // Register widgets
        add_action('widgets_init', array($this, 'register_widgets'));
    }

    /**
     * Register all widgets
     */
    public function register_widgets() {
        register_widget('GSD_Atlas_Search_Widget');
        register_widget('GSD_Atlas_Dog_Profile_Widget');
        register_widget('GSD_Atlas_Recent_Dogs_Widget');
        register_widget('GSD_Atlas_Statistics_Widget');
    }
}

/**
 * Dog Search Widget
 */
class GSD_Atlas_Search_Widget extends WP_Widget {
    public function __construct() {
        parent::__construct(
            'gsd_atlas_search_widget',
            __('GSD Atlas - Dog Search', 'gsd-atlas'),
            array('description' => __('Search German Shepherd Dogs', 'gsd-atlas'))
        );
    }

    public function widget($args, $instance) {
        $title = apply_filters('widget_title', $instance['title']);
        $placeholder = !empty($instance['placeholder']) ? $instance['placeholder'] : __('Search dogs...', 'gsd-atlas');
        $type = !empty($instance['type']) ? $instance['type'] : 'all';

        echo $args['before_widget'];
        
        if (!empty($title)) {
            echo $args['before_title'] . $title . $args['after_title'];
        }

        echo do_shortcode("[gsd_dog_search placeholder=\"{$placeholder}\" type=\"{$type}\"]");
        
        echo $args['after_widget'];
    }

    public function form($instance) {
        $title = !empty($instance['title']) ? $instance['title'] : __('Dog Search', 'gsd-atlas');
        $placeholder = !empty($instance['placeholder']) ? $instance['placeholder'] : __('Search dogs...', 'gsd-atlas');
        $type = !empty($instance['type']) ? $instance['type'] : 'all';
        ?>
        <p>
            <label for="<?php echo $this->get_field_id('title'); ?>"><?php _e('Title:', 'gsd-atlas'); ?></label>
            <input class="widefat" id="<?php echo $this->get_field_id('title'); ?>" 
                   name="<?php echo $this->get_field_name('title'); ?>" type="text" 
                   value="<?php echo esc_attr($title); ?>" />
        </p>
        <p>
            <label for="<?php echo $this->get_field_id('placeholder'); ?>"><?php _e('Placeholder:', 'gsd-atlas'); ?></label>
            <input class="widefat" id="<?php echo $this->get_field_id('placeholder'); ?>" 
                   name="<?php echo $this->get_field_name('placeholder'); ?>" type="text" 
                   value="<?php echo esc_attr($placeholder); ?>" />
        </p>
        <p>
            <label for="<?php echo $this->get_field_id('type'); ?>"><?php _e('Search Type:', 'gsd-atlas'); ?></label>
            <select class="widefat" id="<?php echo $this->get_field_id('type'); ?>" 
                    name="<?php echo $this->get_field_name('type'); ?>">
                <option value="all" <?php selected($type, 'all'); ?>><?php _e('All', 'gsd-atlas'); ?></option>
                <option value="dogs" <?php selected($type, 'dogs'); ?>><?php _e('Dogs Only', 'gsd-atlas'); ?></option>
                <option value="breeders" <?php selected($type, 'breeders'); ?>><?php _e('Breeders Only', 'gsd-atlas'); ?></option>
            </select>
        </p>
        <?php
    }

    public function update($new_instance, $old_instance) {
        $instance = array();
        $instance['title'] = (!empty($new_instance['title'])) ? sanitize_text_field($new_instance['title']) : '';
        $instance['placeholder'] = (!empty($new_instance['placeholder'])) ? sanitize_text_field($new_instance['placeholder']) : '';
        $instance['type'] = (!empty($new_instance['type'])) ? sanitize_text_field($new_instance['type']) : 'all';

        return $instance;
    }
}

/**
 * Dog Profile Widget
 */
class GSD_Atlas_Dog_Profile_Widget extends WP_Widget {
    private $api;

    public function __construct() {
        parent::__construct(
            'gsd_atlas_dog_profile_widget',
            __('GSD Atlas - Dog Profile', 'gsd-atlas'),
            array('description' => __('Display a specific dog profile', 'gsd-atlas'))
        );
        
        $this->api = new GSD_Atlas_API();
    }

    public function widget($args, $instance) {
        $title = apply_filters('widget_title', $instance['title']);
        $dog_id = !empty($instance['dog_id']) ? $instance['dog_id'] : '';
        $show_pedigree = !empty($instance['show_pedigree']) ? $instance['show_pedigree'] : 'false';

        if (empty($dog_id)) {
            return;
        }

        echo $args['before_widget'];
        
        if (!empty($title)) {
            echo $args['before_title'] . $title . $args['after_title'];
        }

        echo do_shortcode("[gsd_dog_profile id=\"{$dog_id}\" show_pedigree=\"{$show_pedigree}\"]");
        
        echo $args['after_widget'];
    }

    public function form($instance) {
        $title = !empty($instance['title']) ? $instance['title'] : __('Dog Profile', 'gsd-atlas');
        $dog_id = !empty($instance['dog_id']) ? $instance['dog_id'] : '';
        $show_pedigree = !empty($instance['show_pedigree']) ? $instance['show_pedigree'] : 'false';
        ?>
        <p>
            <label for="<?php echo $this->get_field_id('title'); ?>"><?php _e('Title:', 'gsd-atlas'); ?></label>
            <input class="widefat" id="<?php echo $this->get_field_id('title'); ?>" 
                   name="<?php echo $this->get_field_name('title'); ?>" type="text" 
                   value="<?php echo esc_attr($title); ?>" />
        </p>
        <p>
            <label for="<?php echo $this->get_field_id('dog_id'); ?>"><?php _e('Dog ID:', 'gsd-atlas'); ?></label>
            <input class="widefat" id="<?php echo $this->get_field_id('dog_id'); ?>" 
                   name="<?php echo $this->get_field_name('dog_id'); ?>" type="text" 
                   value="<?php echo esc_attr($dog_id); ?>" />
            <small><?php _e('Enter the ID of the dog to display', 'gsd-atlas'); ?></small>
        </p>
        <p>
            <input class="checkbox" id="<?php echo $this->get_field_id('show_pedigree'); ?>" 
                   name="<?php echo $this->get_field_name('show_pedigree'); ?>" 
                   type="checkbox" <?php checked($show_pedigree, 'true'); ?> />
            <label for="<?php echo $this->get_field_id('show_pedigree'); ?>">
                <?php _e('Show pedigree', 'gsd-atlas'); ?>
            </label>
        </p>
        <?php
    }

    public function update($new_instance, $old_instance) {
        $instance = array();
        $instance['title'] = (!empty($new_instance['title'])) ? sanitize_text_field($new_instance['title']) : '';
        $instance['dog_id'] = (!empty($new_instance['dog_id'])) ? sanitize_text_field($new_instance['dog_id']) : '';
        $instance['show_pedigree'] = (!empty($new_instance['show_pedigree'])) ? 'true' : 'false';

        return $instance;
    }
}

/**
 * Recent Dogs Widget
 */
class GSD_Atlas_Recent_Dogs_Widget extends WP_Widget {
    private $api;

    public function __construct() {
        parent::__construct(
            'gsd_atlas_recent_dogs_widget',
            __('GSD Atlas - Recent Dogs', 'gsd-atlas'),
            array('description' => __('Display recently added dogs', 'gsd-atlas'))
        );
        
        $this->api = new GSD_Atlas_API();
    }

    public function widget($args, $instance) {
        $title = apply_filters('widget_title', $instance['title']);
        $limit = !empty($instance['limit']) ? intval($instance['limit']) : 5;
        $sex = !empty($instance['sex']) ? $instance['sex'] : '';

        echo $args['before_widget'];
        
        if (!empty($title)) {
            echo $args['before_title'] . $title . $args['after_title'];
        }

        $params = array('per_page' => $limit);
        if (!empty($sex)) {
            $params['sex'] = $sex;
        }

        $dogs = $this->api->get_dogs($params);

        if (!isset($dogs['error']) && !empty($dogs['data'])) {
            echo '<ul class="gsd-recent-dogs-list">';
            foreach ($dogs['data'] as $dog) {
                echo '<li>';
                echo '<a href="?gsd_dog=' . esc_attr($dog['id']) . '">' . esc_html($dog['title']['rendered']) . '</a>';
                if (!empty($dog['meta']['registration_number'])) {
                    echo ' <small>(' . esc_html($dog['meta']['registration_number']) . ')</small>';
                }
                echo '</li>';
            }
            echo '</ul>';
        } else {
            echo '<p>' . __('No dogs found', 'gsd-atlas') . '</p>';
        }
        
        echo $args['after_widget'];
    }

    public function form($instance) {
        $title = !empty($instance['title']) ? $instance['title'] : __('Recent Dogs', 'gsd-atlas');
        $limit = !empty($instance['limit']) ? intval($instance['limit']) : 5;
        $sex = !empty($instance['sex']) ? $instance['sex'] : '';
        ?>
        <p>
            <label for="<?php echo $this->get_field_id('title'); ?>"><?php _e('Title:', 'gsd-atlas'); ?></label>
            <input class="widefat" id="<?php echo $this->get_field_id('title'); ?>" 
                   name="<?php echo $this->get_field_name('title'); ?>" type="text" 
                   value="<?php echo esc_attr($title); ?>" />
        </p>
        <p>
            <label for="<?php echo $this->get_field_id('limit'); ?>"><?php _e('Number of dogs:', 'gsd-atlas'); ?></label>
            <input class="widefat" id="<?php echo $this->get_field_id('limit'); ?>" 
                   name="<?php echo $this->get_field_name('limit'); ?>" type="number" 
                   value="<?php echo esc_attr($limit); ?>" min="1" max="20" />
        </p>
        <p>
            <label for="<?php echo $this->get_field_id('sex'); ?>"><?php _e('Filter by sex:', 'gsd-atlas'); ?></label>
            <select class="widefat" id="<?php echo $this->get_field_id('sex'); ?>" 
                    name="<?php echo $this->get_field_name('sex'); ?>">
                <option value=""><?php _e('All', 'gsd-atlas'); ?></option>
                <option value="MALE" <?php selected($sex, 'MALE'); ?>><?php _e('Male', 'gsd-atlas'); ?></option>
                <option value="FEMALE" <?php selected($sex, 'FEMALE'); ?>><?php _e('Female', 'gsd-atlas'); ?></option>
            </select>
        </p>
        <?php
    }

    public function update($new_instance, $old_instance) {
        $instance = array();
        $instance['title'] = (!empty($new_instance['title'])) ? sanitize_text_field($new_instance['title']) : '';
        $instance['limit'] = (!empty($new_instance['limit'])) ? intval($new_instance['limit']) : 5;
        $instance['sex'] = (!empty($new_instance['sex'])) ? sanitize_text_field($new_instance['sex']) : '';

        return $instance;
    }
}

/**
 * Statistics Widget
 */
class GSD_Atlas_Statistics_Widget extends WP_Widget {
    private $api;

    public function __construct() {
        parent::__construct(
            'gsd_atlas_statistics_widget',
            __('GSD Atlas - Statistics', 'gsd-atlas'),
            array('description' => __('Display GSD Atlas statistics', 'gsd-atlas'))
        );
        
        $this->api = new GSD_Atlas_API();
    }

    public function widget($args, $instance) {
        $title = apply_filters('widget_title', $instance['title']);
        $show_total = !empty($instance['show_total']) ? $instance['show_total'] : 'true';
        $show_recent = !empty($instance['show_recent']) ? $instance['show_recent'] : 'true';

        echo $args['before_widget'];
        
        if (!empty($title)) {
            echo $args['before_title'] . $title . $args['after_title'];
        }

        $stats = $this->api->get_statistics();

        echo '<div class="gsd-widget-stats">';
        
        if ($show_total === 'true') {
            echo '<div class="gsd-stat-item">';
            echo '<span class="gsd-stat-number">' . number_format($stats['total_dogs'] ?? 0) . '</span>';
            echo '<span class="gsd-stat-label">' . __('Total Dogs', 'gsd-atlas') . '</span>';
            echo '</div>';
        }
        
        if ($show_recent === 'true') {
            echo '<div class="gsd-stat-item">';
            echo '<span class="gsd-stat-number">' . count($stats['recent_dogs'] ?? array()) . '</span>';
            echo '<span class="gsd-stat-label">' . __('Recent', 'gsd-atlas') . '</span>';
            echo '</div>';
        }
        
        echo '</div>';
        
        echo $args['after_widget'];
    }

    public function form($instance) {
        $title = !empty($instance['title']) ? $instance['title'] : __('GSD Atlas Stats', 'gsd-atlas');
        $show_total = !empty($instance['show_total']) ? $instance['show_total'] : 'true';
        $show_recent = !empty($instance['show_recent']) ? $instance['show_recent'] : 'true';
        ?>
        <p>
            <label for="<?php echo $this->get_field_id('title'); ?>"><?php _e('Title:', 'gsd-atlas'); ?></label>
            <input class="widefat" id="<?php echo $this->get_field_id('title'); ?>" 
                   name="<?php echo $this->get_field_name('title'); ?>" type="text" 
                   value="<?php echo esc_attr($title); ?>" />
        </p>
        <p>
            <input class="checkbox" id="<?php echo $this->get_field_id('show_total'); ?>" 
                   name="<?php echo $this->get_field_name('show_total'); ?>" 
                   type="checkbox" <?php checked($show_total, 'true'); ?> />
            <label for="<?php echo $this->get_field_id('show_total'); ?>">
                <?php _e('Show total dogs', 'gsd-atlas'); ?>
            </label>
        </p>
        <p>
            <input class="checkbox" id="<?php echo $this->get_field_id('show_recent'); ?>" 
                   name="<?php echo $this->get_field_name('show_recent'); ?>" 
                   type="checkbox" <?php checked($show_recent, 'true'); ?> />
            <label for="<?php echo $this->get_field_id('show_recent'); ?>">
                <?php _e('Show recent additions', 'gsd-atlas'); ?>
            </label>
        </p>
        <?php
    }

    public function update($new_instance, $old_instance) {
        $instance = array();
        $instance['title'] = (!empty($new_instance['title'])) ? sanitize_text_field($new_instance['title']) : '';
        $instance['show_total'] = (!empty($new_instance['show_total'])) ? 'true' : 'false';
        $instance['show_recent'] = (!empty($new_instance['show_recent'])) ? 'true' : 'false';

        return $instance;
    }
}
?>
