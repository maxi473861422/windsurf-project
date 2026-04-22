/**
 * GSD Atlas Frontend JavaScript
 */

(function($) {
    'use strict';

    // Initialize when DOM is ready
    $(document).ready(function() {
        initDogSearch();
        initPedigreeLoader();
        initBreedingSimulator();
        initDogProfileInteractions();
    });

    /**
     * Initialize dog search functionality
     */
    function initDogSearch() {
        $('.gsd-atlas-search').each(function() {
            const $container = $(this);
            const $input = $container.find('.gsd-search-input');
            const $button = $container.find('.gsd-search-button');
            const $results = $container.find('.gsd-search-results');
            const $loading = $container.find('.gsd-search-loading');
            const type = $container.data('type') || 'all';
            const resultsPerPage = $container.data('results-per-page') || 10;

            let searchTimeout;

            // Search on button click
            $button.on('click', function() {
                performSearch();
            });

            // Search on Enter key
            $input.on('keypress', function(e) {
                if (e.which === 13) {
                    e.preventDefault();
                    performSearch();
                }
            });

            // Auto-search with debounce
            $input.on('input', function() {
                clearTimeout(searchTimeout);
                const query = $(this).val().trim();
                
                if (query.length >= 3) {
                    searchTimeout = setTimeout(performSearch, 500);
                } else if (query.length === 0) {
                    $results.empty();
                }
            });

            function performSearch() {
                const query = $input.val().trim();
                
                if (query.length < 2) {
                    $results.html('<p>' + gsdAtlas.strings.no_results + '</p>');
                    return;
                }

                showLoading();

                $.ajax({
                    url: gsdAtlas.apiUrl + '/api/wordpress/search',
                    method: 'GET',
                    data: {
                        q: query,
                        type: type,
                        per_page: resultsPerPage
                    },
                    success: function(data) {
                        hideLoading();
                        displayResults(data);
                    },
                    error: function() {
                        hideLoading();
                        $results.html('<p class="error">' + gsdAtlas.strings.error + '</p>');
                    }
                });
            }

            function showLoading() {
                $loading.show();
                $results.hide();
            }

            function hideLoading() {
                $loading.hide();
                $results.show();
            }

            function displayResults(data) {
                if (!data || data.length === 0) {
                    $results.html('<p>' + gsdAtlas.strings.no_results + '</p>');
                    return;
                }

                let html = '';
                $.each(data, function(index, item) {
                    html += '<div class="gsd-search-result">';
                    html += '<div class="gsd-result-title">';
                    html += '<span class="gsd-result-type">' + item.type + '</span>';
                    
                    if (item.type === 'dog') {
                        html += '<a href="?gsd_dog=' + item.id + '">' + item.title + '</a>';
                    } else {
                        html += '<span>' + item.title + '</span>';
                    }
                    
                    html += '</div>';
                    html += '<div class="gsd-result-meta">' + item.subtitle + '</div>';
                    html += '</div>';
                });

                $results.html(html);
            }
        });
    }

    /**
     * Initialize pedigree loading
     */
    function initPedigreeLoader() {
        $('.gsd-pedigree-container, .gsd-pedigree-tree').each(function() {
            const $container = $(this);
            const dogId = $container.data('dog-id');
            const generations = $container.data('generations') || 5;

            if (!dogId) return;

            loadPedigree(dogId, generations);
        });

        function loadPedigree(dogId, generations) {
            const $container = $('.gsd-pedigree-container[data-dog-id="' + dogId + '"], .gsd-pedigree-tree[data-dog-id="' + dogId + '"]');
            
            $.ajax({
                url: gsdAtlas.apiUrl + '/api/wordpress/pedigree/' + dogId + '/' + generations,
                method: 'GET',
                success: function(data) {
                    if (data.html) {
                        $container.html(data.html);
                    } else if (data.data) {
                        $container.html(buildPedigreeHTML(data.data));
                    }
                },
                error: function() {
                    $container.html('<p class="error">' + gsdAtlas.strings.error + '</p>');
                }
            });
        }

        function buildPedigreeHTML(node, generation = 0) {
            if (!node) return '';

            let html = '<div class="pedigree-generation-' + generation + ' pedigree-dog">';
            html += '<strong>' + node.name + '</strong>';
            if (node.registrationNumber) {
                html += ' (' + node.registrationNumber + ')';
            }
            html += '<br><small>' + node.sex;
            if (node.birthDate) {
                html += ' - ' + new Date(node.birthDate).getFullYear();
            }
            html += '</small>';
            html += '</div>';

            if (node.sire || node.dam) {
                html += '<div class="pedigree-parents">';
                if (node.sire) {
                    html += '<div class="pedigree-sire">';
                    html += buildPedigreeHTML(node.sire, generation + 1);
                    html += '</div>';
                }
                if (node.dam) {
                    html += '<div class="pedigree-dam">';
                    html += buildPedigreeHTML(node.dam, generation + 1);
                    html += '</div>';
                }
                html += '</div>';
            }

            return html;
        }
    }

    /**
     * Initialize breeding simulator
     */
    function initBreedingSimulator() {
        const $simulator = $('.gsd-breeding-simulator');
        if ($simulator.length === 0) return;

        const $sireSearch = $('#gsd-sire-search');
        const $sireId = $('#gsd-sire-id');
        const $sireInfo = $('#gsd-sire-info');
        const $damSearch = $('#gsd-dam-search');
        const $damId = $('#gsd-dam-id');
        const $damInfo = $('#gsd-dam-info');
        const $simulateBtn = $('#gsd-simulate-breeding');
        const $results = $('#gsd-breeding-results');

        // Initialize dog search for sire
        initDogSelector($sireSearch, $sireId, $sireInfo);
        
        // Initialize dog search for dam
        initDogSelector($damSearch, $damId, $damInfo);

        // Simulate breeding button
        $simulateBtn.on('click', function() {
            const sireId = $sireId.val();
            const damId = $damId.val();

            if (!sireId || !damId) {
                alert('Please select both sire and dam');
                return;
            }

            $simulateBtn.prop('disabled', true).text('Simulating...');
            $results.html('<div class="gsd-pedigree-loading"><div class="spinner"></div>Simulating breeding...</div>');

            $.ajax({
                url: gsdAtlas.apiUrl + '/api/breeding/simulate',
                method: 'POST',
                contentType: 'application/json',
                data: JSON.stringify({
                    sireId: sireId,
                    damId: damId
                }),
                success: function(data) {
                    $simulateBtn.prop('disabled', false).text('Simulate Breeding');
                    displayBreedingResults(data);
                },
                error: function() {
                    $simulateBtn.prop('disabled', false).text('Simulate Breeding');
                    $results.html('<p class="error">Error simulating breeding. Please try again.</p>');
                }
            });
        });

        function initDogSelector($input, $hiddenInput, $infoDisplay) {
            let searchTimeout;

            $input.on('input', function() {
                clearTimeout(searchTimeout);
                const query = $(this).val().trim();
                
                if (query.length >= 3) {
                    searchTimeout = function() {
                        searchDogs(query, $input, $hiddenInput, $infoDisplay);
                    };
                    setTimeout(searchTimeout, 500);
                }
            });

            $input.on('blur', function() {
                setTimeout(function() {
                    $input.next('.gsd-search-dropdown').remove();
                }, 200);
            });
        }

        function searchDogs(query, $input, $hiddenInput, $infoDisplay) {
            $.ajax({
                url: gsdAtlas.apiUrl + '/api/wordpress/search',
                method: 'GET',
                data: {
                    q: query,
                    type: 'dogs',
                    per_page: 10
                },
                success: function(data) {
                    displayDogSearchResults(data, $input, $hiddenInput, $infoDisplay);
                },
                error: function() {
                    // Handle error silently
                }
            });
        }

        function displayDogSearchResults(dogs, $input, $hiddenInput, $infoDisplay) {
            // Remove existing dropdown
            $input.next('.gsd-search-dropdown').remove();

            if (!dogs || dogs.length === 0) {
                return;
            }

            let $dropdown = $('<div class="gsd-search-dropdown" style="position: absolute; background: white; border: 1px solid #ddd; border-top: none; max-height: 200px; overflow-y: auto; z-index: 1000;"></div>');

            $.each(dogs, function(index, dog) {
                if (dog.type === 'dog') {
                    const $item = $('<div style="padding: 10px; cursor: pointer; border-bottom: 1px solid #eee;">' + dog.title + ' (' + dog.subtitle + ')</div>');
                    $item.on('click', function() {
                        $input.val(dog.title);
                        $hiddenInput.val(dog.id);
                        displaySelectedDog(dog, $infoDisplay);
                        $dropdown.remove();
                    });
                    $dropdown.append($item);
                }
            });

            $input.after($dropdown);
        }

        function displaySelectedDog(dog, $infoDisplay) {
            let html = '<div style="padding: 10px; background: #f9f9f9; border: 1px solid #ddd; border-radius: 4px; margin-top: 5px;">';
            html += '<strong>' + dog.title + '</strong>';
            if (dog.subtitle) {
                html += '<br><small>' + dog.subtitle + '</small>';
            }
            html += '</div>';
            $infoDisplay.html(html);
        }

        function displayBreedingResults(data) {
            let html = '<h3>Simulation Results</h3>';
            
            // Parent information
            html += '<div class="gsd-breeding-parents">';
            html += '<h4>Parents</h4>';
            html += '<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">';
            
            html += '<div><strong>Sire:</strong> ' + data.sire.name + '</div>';
            html += '<div><strong>Dam:</strong> ' + data.dam.name + '</div>';
            html += '</div></div>';

            // COI information
            html += '<div class="gsd-coi-info">';
            html += '<h4>Coefficient of Inbreeding (COI)</h4>';
            html += '<p><strong>COI: ' + (data.coi * 100).toFixed(2) + '%</strong></p>';
            
            if (data.coi > 0.125) {
                html += '<p style="color: red;">High COI - Not recommended for breeding</p>';
            } else if (data.coi > 0.0625) {
                html += '<p style="color: orange;">Moderate COI - Use with caution</p>';
            } else {
                html += '<p style="color: green;">Low COI - Good for breeding</p>';
            }
            html += '</div>';

            // Common ancestors
            if (data.commonAncestors && data.commonAncestors.length > 0) {
                html += '<div class="gsd-common-ancestors">';
                html += '<h4>Common Ancestors</h4>';
                html += '<ul>';
                $.each(data.commonAncestors, function(index, ancestor) {
                    html += '<li>' + ancestor.name + ' (' + (ancestor.contribution * 100).toFixed(2) + '%)</li>';
                });
                html += '</ul></div>';
            }

            // Health risks
            if (data.healthRisks) {
                html += '<div class="gsd-health-risks">';
                html += '<h4>Health Risk Analysis</h4>';
                
                if (data.healthRisks.hipDysplasia) {
                    html += '<div><strong>Hip Dysplasia Risk:</strong> ';
                    html += '<span class="health-score-' + getHealthScoreClass(data.healthRisks.hipDysplasia.risk) + '">';
                    html += (data.healthRisks.hipDysplasia.risk * 100).toFixed(1) + '%</span></div>';
                }
                
                if (data.healthRisks.elbowDysplasia) {
                    html += '<div><strong>Elbow Dysplasia Risk:</strong> ';
                    html += '<span class="health-score-' + getHealthScoreClass(data.healthRisks.elbowDysplasia.risk) + '">';
                    html += (data.healthRisks.elbowDysplasia.risk * 100).toFixed(1) + '%</span></div>';
                }
                
                html += '</div>';
            }

            // Recommendations
            if (data.recommendations && data.recommendations.length > 0) {
                html += '<div class="gsd-recommendations">';
                html += '<h4>Recommendations</h4>';
                html += '<ul>';
                $.each(data.recommendations, function(index, recommendation) {
                    html += '<li>' + recommendation + '</li>';
                });
                html += '</ul></div>';
            }

            $results.html(html);
        }

        function getHealthScoreClass(risk) {
            if (risk <= 0.3) return 'good';
            if (risk <= 0.6) return 'fair';
            return 'poor';
        }
    }

    /**
     * Initialize dog profile interactions
     */
    function initDogProfileInteractions() {
        // Handle URL parameter for dog profile display
        const urlParams = new URLSearchParams(window.location.search);
        const dogId = urlParams.get('gsd_dog');
        
        if (dogId) {
            // Scroll to dog profile if it exists
            const $profile = $('.gsd-dog-profile[data-dog-id="' + dogId + '"]');
            if ($profile.length > 0) {
                $('html, body').animate({
                    scrollTop: $profile.offset().top - 100
                }, 500);
            }
        }
    }

})(jQuery);
