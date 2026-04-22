<?php
/**
 * GSD Atlas API Class
 * Handles communication with the GSD Atlas backend API
 */

if (!defined('ABSPATH')) {
    exit;
}

class GSD_Atlas_API {
    private $api_url;
    private $cache_duration;
    private $enable_caching;

    public function __construct() {
        $this->api_url = get_option('gsd_atlas_api_url', 'http://localhost:3001');
        $this->cache_duration = get_option('gsd_atlas_cache_duration', 3600);
        $this->enable_caching = get_option('gsd_atlas_enable_caching', 1);
    }

    /**
     * Make API request with caching
     */
    private function make_request($endpoint, $params = array()) {
        $cache_key = md5($endpoint . serialize($params));
        
        // Check cache first
        if ($this->enable_caching) {
            $cached = $this->get_cache($cache_key);
            if ($cached !== false) {
                return $cached;
            }
        }

        // Build URL
        $url = $this->api_url . $endpoint;
        if (!empty($params)) {
            $url .= '?' . http_build_query($params);
        }

        // Make request
        $response = wp_remote_get($url, array(
            'timeout' => 30,
            'headers' => array(
                'Content-Type' => 'application/json',
                'Accept' => 'application/json',
            ),
        ));

        if (is_wp_error($response)) {
            error_log('GSD Atlas API Error: ' . $response->get_error_message());
            return array('error' => $response->get_error_message());
        }

        $body = wp_remote_retrieve_body($response);
        $data = json_decode($body, true);

        if (json_last_error() !== JSON_ERROR_NONE) {
            error_log('GSD Atlas API JSON Error: ' . json_last_error_msg());
            return array('error' => 'Invalid JSON response');
        }

        // Cache successful responses
        if ($this->enable_caching && !isset($data['error'])) {
            $this->set_cache($cache_key, $data);
        }

        return $data;
    }

    /**
     * Get dogs list
     */
    public function get_dogs($params = array()) {
        $defaults = array(
            'page' => 1,
            'per_page' => 20,
            'search' => '',
            'sex' => '',
        );
        
        $params = wp_parse_args($params, $defaults);
        
        return $this->make_request('/api/wordpress/dogs', $params);
    }

    /**
     * Get single dog
     */
    public function get_dog($dog_id) {
        return $this->make_request("/api/wordpress/dogs/{$dog_id}");
    }

    /**
     * Get pedigree
     */
    public function get_pedigree($dog_id, $generations = 5) {
        return $this->make_request("/api/wordpress/pedigree/{$dog_id}/{$generations}");
    }

    /**
     * Search dogs and breeders
     */
    public function search($query, $type = 'all') {
        return $this->make_request('/api/wordpress/search', array(
            'q' => $query,
            'type' => $type,
        ));
    }

    /**
     * Get COI calculation
     */
    public function get_coi($dog_id) {
        return $this->make_request("/api/pedigree/{$dog_id}/coi");
    }

    /**
     * Get common ancestors
     */
    public function get_common_ancestors($sire_id, $dam_id) {
        return $this->make_request("/api/pedigree/common-ancestors/{$sire_id}/{$dam_id}");
    }

    /**
     * Simulate breeding
     */
    public function simulate_breeding($sire_id, $dam_id) {
        $response = wp_remote_post($this->api_url . '/api/breeding/simulate', array(
            'timeout' => 30,
            'headers' => array(
                'Content-Type' => 'application/json',
            ),
            'body' => json_encode(array(
                'sireId' => $sire_id,
                'damId' => $dam_id,
            )),
        ));

        if (is_wp_error($response)) {
            return array('error' => $response->get_error_message());
        }

        $body = wp_remote_retrieve_body($response);
        return json_decode($body, true);
    }

    /**
     * Cache functions
     */
    private function get_cache($key) {
        global $wpdb;
        
        $table_name = $wpdb->prefix . 'gsd_atlas_cache';
        $current_time = time();
        
        $result = $wpdb->get_row($wpdb->prepare(
            "SELECT cache_value FROM $table_name WHERE cache_key = %s AND cache_expires > %d",
            $key,
            $current_time
        ));
        
        if ($result) {
            return json_decode($result->cache_value, true);
        }
        
        return false;
    }

    private function set_cache($key, $value) {
        global $wpdb;
        
        $table_name = $wpdb->prefix . 'gsd_atlas_cache';
        $expires = time() + $this->cache_duration;
        
        $wpdb->replace(
            $table_name,
            array(
                'cache_key' => $key,
                'cache_value' => json_encode($value),
                'cache_expires' => $expires,
            ),
            array('%s', '%s', '%d')
        );
    }

    /**
     * Clear cache
     */
    public function clear_cache() {
        global $wpdb;
        
        $table_name = $wpdb->prefix . 'gsd_atlas_cache';
        $wpdb->query("TRUNCATE TABLE $table_name");
    }

    /**
     * Get statistics for dashboard
     */
    public function get_statistics() {
        $stats = array();
        
        // Get total dogs count
        $dogs_response = $this->get_dogs(array('per_page' => 1));
        if (isset($dogs_response['pagination'])) {
            $stats['total_dogs'] = $dogs_response['pagination']['total'];
        }
        
        // Get recent dogs
        $recent_dogs = $this->get_dogs(array('per_page' => 5));
        $stats['recent_dogs'] = $recent_dogs['data'] ?? array();
        
        return $stats;
    }
}
?>
