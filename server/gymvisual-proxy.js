/**
 * GymVisual Proxy Server
 *
 * A lightweight Express server that acts as an API proxy for gymvisual.com.
 * It fetches pages, parses the HTML with Cheerio, and returns structured JSON.
 *
 * Endpoints:
 *   GET /api/gymvisual/exercises  - Fetch exercises with filters & pagination
 *   GET /api/gymvisual/filters    - Get available filter options (parsed from the page)
 *
 * Query params for /exercises:
 *   gender       - 49 (male, default) or 48 (female)
 *   exerciseType - e.g. 69 (strength), 74 (aerobic), 63 (stretching), 0/omit for all
 *   bodyPart     - filter ID, 0/omit for all
 *   equipment    - filter ID, 0/omit for all
 *   page         - page number (default 1)
 *   perPage      - items per page: 20, 40, or 80 (default 20)
 */

const express = require('express');
const cors = require('cors');
const cheerio = require('cheerio');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.GYMVISUAL_PROXY_PORT || 3200;

app.use(cors());

// ──────────────────────────────────────────────
// Helper: build GymVisual advanced-search URL
// ──────────────────────────────────────────────
function buildGymVisualUrl({ gender = 49, exerciseType = 0, bodyPart = 0, equipment = 0, page = 1, perPage = 20 }) {
  // GymVisual uses a form-based search via query string params
  const base = 'https://gymvisual.com/module/pm_advancedsearch4/advancedsearch4';
  const params = new URLSearchParams();

  // Media type: Animated GIFs (fixed = 59)
  params.append('as4c[9][]', '59');
  // Style type: Basic grey (fixed = 10)
  params.append('as4c[4][]', '10');
  // Exercise type
  params.append('as4c[10][]', exerciseType > 0 ? String(exerciseType) : '');
  // Body part
  params.append('as4c[5][]', bodyPart > 0 ? String(bodyPart) : '');
  // Equipment
  params.append('as4c[6][]', equipment > 0 ? String(equipment) : '');
  // Gender
  params.append('as4c[7][]', String(gender));
  // Category: Animated GIFs (fixed = 54)
  params.append('as4c[3][]', '54');
  params.append('as4c_hidden[3][]', '54');

  params.append('reset_group', '');
  params.append('id_search', '1');
  params.append('id_category_search', '16');
  params.append('orderby', 'sales');
  params.append('orderway', 'desc');
  params.append('n', String(perPage));
  params.append('p', String(page));

  return `${base}?${params.toString()}`;
}

// ──────────────────────────────────────────────
// Helper: parse exercise list from HTML
// ──────────────────────────────────────────────
function parseExercises(html) {
  const $ = cheerio.load(html);
  const exercises = [];

  $('ul.product_list li.ajax_block_product').each((_, el) => {
    const $el = $(el);
    const $link = $el.find('a.product_img_link');
    const $img = $el.find('img.replace-2x');
    const $name = $el.find('a.product-name');
    const $ref = $el.find('a.product-reference');
    const $checkbox = $el.find('input.add_me_to_cart');

    const name = ($name.attr('title') || $name.text() || '').trim();
    const gifUrl = $img.attr('src') || '';
    const detailUrl = $link.attr('href') || '';
    const reference = ($ref.attr('title') || $ref.text() || '').replace(/[\[\]]/g, '').trim();
    const id = parseInt($checkbox.attr('value') || '0', 10);

    if (name) {
      exercises.push({ id, name, gifUrl, detailUrl, reference });
    }
  });

  return exercises;
}

// ──────────────────────────────────────────────
// Helper: parse pagination info
// ──────────────────────────────────────────────
function parsePagination(html) {
  const $ = cheerio.load(html);

  // total items from "Showing X - Y of Z items"
  const countText = $('.product-count').first().text().trim();
  const totalMatch = countText.match(/of\s+([\d,]+)\s+items/i);
  const totalItems = totalMatch ? parseInt(totalMatch[1].replace(/,/g, ''), 10) : 0;

  // heading counter "There are XXXX products."
  const headingText = $('.heading-counter').text().trim();
  const headingMatch = headingText.match(/([\d,]+)\s+products/i);
  const totalProducts = headingMatch ? parseInt(headingMatch[1].replace(/,/g, ''), 10) : totalItems;

  // current page
  const activePage = $('ul.pagination li.active span span').first().text().trim();
  const currentPage = parseInt(activePage, 10) || 1;

  // last page
  let lastPage = currentPage;
  $('ul.pagination li a span').each((_, el) => {
    const pageNum = parseInt($(el).text().trim(), 10);
    if (!isNaN(pageNum) && pageNum > lastPage) {
      lastPage = pageNum;
    }
  });

  return {
    currentPage,
    totalPages: lastPage,
    totalItems: totalProducts || totalItems,
  };
}

// ──────────────────────────────────────────────
// Helper: parse filter options from left column
// ──────────────────────────────────────────────
function parseFilters(html) {
  const $ = cheerio.load(html);
  const filters = {};

  const groupMap = {
    '10': 'exerciseTypes',
    '5': 'bodyParts',
    '6': 'equipmentTypes',
    '7': 'genders',
  };

  for (const [groupId, filterName] of Object.entries(groupMap)) {
    const options = [];
    options.push({ id: 0, name: 'All', count: null });

    $(`#PM_ASCriterionGroupCheckbox_1_${groupId} li`).each((_, el) => {
      const $el = $(el);
      const $input = $el.find('input');
      const value = parseInt($input.attr('value') || '0', 10);

      if (!value) return; // skip "All" radio (value="")

      const $label = $el.find('.PM_ASLabelLink').first();
      let labelText = ($label.length ? $label.text() : $el.find('label').first().text()).trim();
      // Remove the count part from the label
      const countMatch = labelText.match(/\((\d+)\)/);
      const count = countMatch ? parseInt(countMatch[1], 10) : null;
      const name = labelText.replace(/\(\d+\)/, '').trim();

      if (name) {
        options.push({ id: value, name, count });
      }
    });

    filters[filterName] = options;
  }

  return filters;
}

// ──────────────────────────────────────────────
// Routes
// ──────────────────────────────────────────────

/**
 * GET /api/gymvisual/exercises
 * Fetches exercises from GymVisual with filters, returns JSON.
 */
app.get('/api/gymvisual/exercises', async (req, res) => {
  try {
    const gender = parseInt(req.query.gender, 10) || 49;
    const exerciseType = parseInt(req.query.exerciseType, 10) || 0;
    const bodyPart = parseInt(req.query.bodyPart, 10) || 0;
    const equipment = parseInt(req.query.equipment, 10) || 0;
    const page = parseInt(req.query.page, 10) || 1;
    const perPage = parseInt(req.query.perPage, 10) || 20;

    const url = buildGymVisualUrl({ gender, exerciseType, bodyPart, equipment, page, perPage });

    console.log(`[GymVisual Proxy] Fetching: ${url}`);

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    if (!response.ok) {
      throw new Error(`GymVisual returned ${response.status}`);
    }

    const html = await response.text();
    const exercises = parseExercises(html);
    const pagination = parsePagination(html);

    res.json({
      exercises,
      pagination,
      filters: { gender, exerciseType, bodyPart, equipment },
    });
  } catch (err) {
    console.error('[GymVisual Proxy] Error:', err.message);
    res.status(502).json({ error: 'Failed to fetch from GymVisual', details: err.message });
  }
});

/**
 * GET /api/gymvisual/filters
 * Fetches the filter sidebar from GymVisual and returns structured options.
 */
app.get('/api/gymvisual/filters', async (req, res) => {
  try {
    // Fetch a default page to get filter options
    const url = buildGymVisualUrl({ gender: 49, exerciseType: 69 });
    console.log(`[GymVisual Proxy] Fetching filters from: ${url}`);

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });

    if (!response.ok) {
      throw new Error(`GymVisual returned ${response.status}`);
    }

    const html = await response.text();
    const filters = parseFilters(html);

    res.json(filters);
  } catch (err) {
    console.error('[GymVisual Proxy] Error fetching filters:', err.message);
    res.status(502).json({ error: 'Failed to fetch filters', details: err.message });
  }
});

// Health check
app.get('/api/gymvisual/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`[GymVisual Proxy] Running on http://localhost:${PORT}`);
  console.log(`[GymVisual Proxy] Exercises: http://localhost:${PORT}/api/gymvisual/exercises`);
  console.log(`[GymVisual Proxy] Filters:   http://localhost:${PORT}/api/gymvisual/filters`);
});
