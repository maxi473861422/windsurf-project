no l<?php
/**
 * GSD Atlas Shortcodes Class
 * Defines shortcodes for displaying GSD Atlas data in WordPress
 */

if (!defined('ABSPATH')) {
    exit;
}

class GSD_Atlas_Shortcodes {
    private $api;

    public function __construct($api) {
        $this->api = $api;
        
        // Register shortcodes
        add_shortcode('gsd_dog_search', array($this, 'dog_search_shortcode'));
        add_shortcode('gsd_dog_profile', array($this, 'dog_profile_shortcode'));
        add_shortcode('gsd_pedigree', array($this, 'pedigree_shortcode'));
        add_shortcode('gsd_breeding_simulator', array($this, 'breeding_simulator_shortcode'));
        add_shortcode('gsd_dogs_list', array($this, 'dogs_list_shortcode'));
        add_shortcode('gsd_statistics', array($this, 'statistics_shortcode'));
    }

    /**
     * Dog search shortcode
     * Usage: [gsd_dog_search placeholder="Search dogs..." type="all"]
     */
    public function dog_search_shortcode($atts) {
        $atts = shortcode_atts(array(
            'placeholder' => __('Search German Shepherd Dogs...', 'gsd-atlas'),
            'type' => 'all', // all, dogs, breeders
            'results_per_page' => 10,
        ), $atts);

        ob_start();
        ?>
        <div class="gsd-atlas-search" data-type="<?php echo esc_attr($atts['type']); ?>" data-results-per-page="<?php echo esc_attr($atts['results_per_page']); ?>">
            <div class="gsd-search-form">
                <input type="text" class="gsd-search-input" placeholder="<?php echo esc_attr($atts['placeholder']); ?>" />
                <button type="button" class="gsd-search-button"><?php _e('Search', 'gsd-atlas'); ?></button>
            </div>
            <div class="gsd-search-results"></div>
            <div class="gsd-search-loading" style="display: none;">
                <div class="spinner"></div>
                <?php _e('Searching...', 'gsd-atlas'); ?>
            </div>
        </div>
        <?php
        return ob_get_clean();
    }

    /**
     * Dog profile shortcode
     * Usage: [gsd_dog_profile id="dog-id" show_pedigree="true" show_health="true"]
     */
    public function dog_profile_shortcode($atts) {
        $atts = shortcode_atts(array(
            'id' => '',
            'show_pedigree' => 'true',
            'show_health' => 'true',
            'show_offspring' => 'true',
        ), $atts);

        if (empty($atts['id'])) {
            return '<p class="error">' . __('Please provide a dog ID', 'gsd-atlas') . '</p>';
        }

        $dog = $this->api->get_dog($atts['id']);
        
        if (isset($dog['error'])) {
            return '<p class="error">' . __('Dog not found', 'gsd-atlas') . '</p>';
        }

        ob_start();
        ?>
        <div class="gsd-dog-profile" data-dog-id="<?php echo esc_attr($atts['id']); ?>">
            <div class="gsd-dog-header">
                <?php if (!empty($dog['meta']['image_url'])): ?>
                    <div class="gsd-dog-image">
                        <img src="<?php echo esc_url($dog['meta']['image_url']); ?>" alt="<?php echo esc_attr($dog['title']['rendered']); ?>" />
                    </div>
                <?php endif; ?>
                <div class="gsd-dog-info">
                    <h2><?php echo esc_html($dog['title']['rendered']); ?></h2>
                    <div class="gsd-dog-meta">
                        <?php if (!empty($dog['meta']['registration_number'])): ?>
                            <span class="registration"><?php echo esc_html($dog['meta']['registration_number']); ?></span>
                        <?php endif; ?>
                        <span class="sex"><?php echo esc_html($dog['meta']['sex']); ?></span>
                        <?php if (!empty($dog['meta']['birth_date'])): ?>
                            <span class="birth-date"><?php echo date('Y', strtotime($dog['meta']['birth_date'])); ?></span>
                        <?php endif; ?>
                    </div>
                </div>
            </div>

            <div class="gsd-dog-details">
                <div class="gsd-dog-basic-info">
                    <h3><?php _e('Basic Information', 'gsd-atlas'); ?></h3>
                    <table class="gsd-info-table">
                        <?php if (!empty($dog['meta']['color'])): ?>
                            <tr><td><?php _e('Color:', 'gsd-atlas'); ?></td><td><?php echo esc_html($dog['meta']['color']); ?></td></tr>
                        <?php endif; ?>
                        <?php if (!empty($dog['meta']['weight'])): ?>
                            <tr><td><?php _e('Weight:', 'gsd-atlas'); ?></td><td><?php echo esc_html($dog['meta']['weight']); ?> kg</td></tr>
                        <?php endif; ?>
                        <?php if (!empty($dog['meta']['height'])): ?>
                            <tr><td><?php _e('Height:', 'gsd-atlas'); ?></td><td><?php echo esc_html($dog['meta']['height']); ?> cm</td></tr>
                        <?php endif; ?>
                        <?php if (!empty($dog['meta']['breeder'])): ?>
                            <tr><td><?php _e('Breeder:', 'gsd-atlas'); ?></td><td><?php echo esc_html($dog['meta']['breeder']['name']); ?></td></tr>
                        <?php endif; ?>
                    </table>
                </div>

                <?php if ($atts['show_health'] === 'true' && !empty($dog['meta']['health_records'])): ?>
                    <div class="gsd-dog-health">
                        <h3><?php _e('Health Records', 'gsd-atlas'); ?></h3>
                        <table class="gsd-health-table">
                            <?php foreach ($dog['meta']['health_records'] as $record): ?>
                                <tr>
                                    <td><?php echo esc_html($record['type']); ?></td>
                                    <td><?php echo esc_html($record['result']); ?></td>
                                    <td><?php echo date('Y-m-d', strtotime($record['date'])); ?></td>
                                </tr>
                            <?php endforeach; ?>
                        </table>
                    </div>
                <?php endif; ?>

                <?php if (!empty($dog['meta']['sire']) || !empty($dog['meta']['dam'])): ?>
                    <div class="gsd-dog-parents">
                        <h3><?php _e('Parents', 'gsd-atlas'); ?></h3>
                        <div class="gsd-parents-grid">
                            <?php if (!empty($dog['meta']['sire'])): ?>
                                <div class="gsd-parent">
                                    <strong><?php _e('Sire:', 'gsd-atlas'); ?></strong>
                                    <a href="?gsd_dog=<?php echo esc_attr($dog['meta']['sire']['id']); ?>">
                                        <?php echo esc_html($dog['meta']['sire']['name']); ?>
                                    </a>
                                </div>
                            <?php endif; ?>
                            <?php if (!empty($dog['meta']['dam'])): ?>
                                <div class="gsd-parent">
                                    <strong><?php _e('Dam:', 'gsd-atlas'); ?></strong>
                                    <a href="?gsd_dog=<?php echo esc_attr($dog['meta']['dam']['id']); ?>">
                                        <?php echo esc_html($dog['meta']['dam']['name']); ?>
                                    </a>
                                </div>
                            <?php endif; ?>
                        </div>
                    </div>
                <?php endif; ?>

                <?php if ($atts['show_pedigree'] === 'true'): ?>
                    <div class="gsd-dog-pedigree">
                        <h3><?php _e('Pedigree', 'gsd-atlas'); ?></h3>
                        <div class="gsd-pedigree-container" data-dog-id="<?php echo esc_attr($atts['id']); ?>">
                            <div class="gsd-pedigree-loading">
                                <div class="spinner"></div>
                                <?php _e('Loading pedigree...', 'gsd-atlas'); ?>
                            </div>
                        </div>
                    </div>
                <?php endif; ?>
            </div>
        </div>
        <?php
        return ob_get_clean();
    }

    /**
     * Pedigree shortcode
     * Usage: [gsd_pedigree id="dog-id" generations="5"]
     */
    public function pedigree_shortcode($atts) {
        $atts = shortcode_atts(array(
            'id' => '',
            'generations' => 5,
        ), $atts);

        if (empty($atts['id'])) {
            return '<p class="error">' . __('Please provide a dog ID', 'gsd-atlas') . '</p>';
        }

        ob_start();
        ?>
        <div class="gsd-pedigree-tree" data-dog-id="<?php echo esc_attr($atts['id']); ?>" data-generations="<?php echo esc_attr($atts['generations']); ?>">
            <div class="gsd-pedigree-loading">
                <div class="spinner"></div>
                <?php _e('Loading pedigree...', 'gsd-atlas'); ?>
            </div>
        </div>
        <?php
        return ob_get_clean();
    }

    /**
     * Breeding simulator shortcode
     * Usage: [gsd_breeding_simulator]
     */
    public function breeding_simulator_shortcode($atts) {
        ob_start();
        ?>
        <div class="gsd-breeding-simulator">
            <h3><?php _e('Breeding Simulator', 'gsd-atlas'); ?></h3>
            <div class="gsd-breeding-form">
                <div class="gsd-form-row">
                    <div class="gsd-form-group">
                        <label for="gsd-sire-search"><?php _e('Select Sire:', 'gsd-atlas'); ?></label>
                        <input type="text" id="gsd-sire-search" class="gsd-dog-search-input" placeholder="<?php _e('Search for sire...', 'gsd-atlas'); ?>" />
                        <input type="hidden" id="gsd-sire-id" />
                        <div id="gsd-sire-info" class="gsd-selected-dog-info"></div>
                    </div>
                    <div class="gsd-form-group">
                        <label for="gsd-dam-search"><?php _e('Select Dam:', 'gsd-atlas'); ?></label>
                        <input type="text" id="gsd-dam-search" class="gsd-dog-search-input" placeholder="<?php _e('Search for dam...', 'gsd-atlas'); ?>" />
                        <input type="hidden" id="gsd-dam-id" />
                        <div id="gsd-dam-info" class="gsd-selected-dog-info"></div>
                    </div>
                </div>
                <button type="button" id="gsd-simulate-breeding" class="gsd-button gsd-button-primary"><?php _e('Simulate Breeding', 'gsd-atlas'); ?></button>
            </div>
            <div id="gsd-breeding-results" class="gsd-breeding-results"></div>
        </div>
        <?php
        return ob_get_clean();
    }

    /**
     * Dogs list shortcode
     * Usage: [gsd_dogs_list limit="10" sex="MALE" search="keyword"]
     */
    public function dogs_list_shortcode($atts) {
        $atts = shortcode_atts(array(
            'limit' => 10,
            'sex' => '',
            'search' => '',
            'show_pagination' => 'true',
        ), $atts);

        $params = array(
            'per_page' => intval($atts['limit']),
        );
        
        if (!empty($atts['sex'])) {
            $params['sex'] = $atts['sex'];
        }
        
        if (!empty($atts['search'])) {
            $params['search'] = $atts['search'];
        }

        $dogs = $this->api->get_dogs($params);

        if (isset($dogs['error'])) {
            return '<p class="error">' . __('Error loading dogs', 'gsd-atlas') . '</p>';
        }

        ob_start();
        ?>
        <div class="gsd-dogs-list">
            <?php if (!empty($dogs['data'])): ?>
                <div class="gsd-dogs-grid">
                    <?php foreach ($dogs['data'] as $dog): ?>
                        <div class="gsd-dog-card">
                            <?php if (!empty($dog['meta']['image_url'])): ?>
                                <div class="gsd-dog-card-image">
                                    <img src="<?php echo esc_url($dog['meta']['image_url']); ?>" alt="<?php echo esc_attr($dog['title']['rendered']); ?>" />
                                </div>
                            <?php endif; ?>
                            <div class="gsd-dog-card-content">
                                <h4><a href="?gsd_dog=<?php echo esc_attr($dog['id']); ?>"><?php echo esc_html($dog['title']['rendered']); ?></a></h4>
                                <div class="gsd-dog-card-meta">
                                    <?php if (!empty($dog['meta']['registration_number'])): ?>
                                        <span class="registration"><?php echo esc_html($dog['meta']['registration_number']); ?></span>
                                    <?php endif; ?>
                                    <span class="sex"><?php echo esc_html($dog['meta']['sex']); ?></span>
                                </div>
                                <?php if (!empty($dog['meta']['sire']) || !empty($dog['meta']['dam'])): ?>
                                    <div class="gsd-dog-card-parents">
                                        <?php if (!empty($dog['meta']['sire'])): ?>
                                            <small><?php _e('Sire:', 'gsd-atlas'); ?> <?php echo esc_html($dog['meta']['sire']['name']); ?></small>
                                        <?php endif; ?>
                                        <?php if (!empty($dog['meta']['dam'])): ?>
                                            <small><?php _e('Dam:', 'gsd-atlas'); ?> <?php echo esc_html($dog['meta']['dam']['name']); ?></small>
                                        <?php endif; ?>
                                    </div>
                                <?php endif; ?>
                            </div>
                        </div>
                    <?php endforeach; ?>
                </div>
                
                <?php if ($atts['show_pagination'] === 'true' && isset($dogs['pagination']) && $dogs['pagination']['totalPages'] > 1): ?>
                    <div class="gsd-pagination">
                        <?php
                        $current_page = isset($_GET['page']) ? intval($_GET['page']) : 1;
                        $total_pages = $dogs['pagination']['totalPages'];
                        
                        for ($i = 1; $i <= $total_pages; $i++):
                            $class = $i === $current_page ? 'active' : '';
                        ?>
                            <a href="?page=<?php echo $i; ?>" class="gsd-page-link <?php echo $class; ?>"><?php echo $i; ?></a>
                        <?php endfor; ?>
                    </div>
                <?php endif; ?>
            <?php else: ?>
                <p><?php _e('No dogs found', 'gsd-atlas'); ?></p>
            <?php endif; ?>
        </div>
        <?php
        return ob_get_clean();
    }

    /**
     * Statistics shortcode
     * Usage: [gsd_statistics]
     */
    public function statistics_shortcode($atts) {
        $stats = $this->api->get_statistics();

        ob_start();
        ?>
        <div class="gsd-statistics">
            <h3><?php _e('GSD Atlas Statistics', 'gsd-atlas'); ?></h3>
            <div class="gsd-stats-grid">
                <div class="gsd-stat-item">
                    <div class="gsd-stat-number"><?php echo number_format($stats['total_dogs'] ?? 0); ?></div>
                    <div class="gsd-stat-label"><?php _e('Total Dogs', 'gsd-atlas'); ?></div>
                </div>
                <div class="gsd-stat-item">
                    <div class="gsd-stat-number"><?php echo count($stats['recent_dogs'] ?? array()); ?></div>
                    <div class="gsd-stat-label"><?php _e('Recent Additions', 'gsd-atlas'); ?></div>
                </div>
            </div>
            
            <?php if (!empty($stats['recent_dogs'])): ?>
                <div class="gsd-recent-dogs">
                    <h4><?php _e('Recently Added Dogs', 'gsd-atlas'); ?></h4>
                    <ul>
                        <?php foreach ($stats['recent_dogs'] as $dog): ?>
                            <li>
                                <a href="?gsd_dog=<?php echo esc_attr($dog['id']); ?>">
                                    <?php echo esc_html($dog['title']['rendered']); ?>
                                </a>
                            </li>
                        <?php endforeach; ?>
                    </ul>
                </div>
            <?php endif; ?>
        </div>
        <?php
        return ob_get_clean();
    }
}
?>
