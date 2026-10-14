# Cleanup script - removes all temporary and test files

Write-Host "Starting project cleanup..." -ForegroundColor Yellow

# List of files to delete
$filesToDelete = @(
    "accessories.csv",
    "add_electronics_smi.mjs",
    "add_is_hidden_column.sql",
    "add_new_pinned_products.js",
    "add_new_pinned_products_v2.js",
    "add_new_pinned_products_v3.mjs",
    "add_popular_products.js",
    "add_products_test.js",
    "add_products_via_api.js",
    "add_shoes_smi.mjs",
    "add_tshirts_shorts_smi.mjs",
    "all_product_names.txt",
    "analyze_brand_codes.js",
    "BACKUP_30_POPULAR_PRODUCTS.md",
    "BACKUP_30_POPULAR_WITH_NAMES.csv",
    "BACKUP_30_POPULAR_WITH_NAMES.json",
    "BACKUP_30_POPULAR_WITH_NAMES.md",
    "backup_pinned_and_delete_all.js",
    "BACKUP_RESTORE_FEATURE.md",
    "BACKUP_TEMPLATE_DO_WYPELNIENIA.md",
    "BRAND_MAPPING_ANALYSIS.md",
    "BRAND_MAP_FIXES.js",
    "check_and_fix_categories.js",
    "check_bad_categories.js",
    "check_chinese_names.js",
    "check_duplicates.js",
    "check_jacket_links.mjs",
    "check_missing_products.js",
    "check_pinned.mjs",
    "check_products_stats.mjs",
    "check_product_count.js",
    "check_qc_db.js",
    "check_qc_db_raw.js",
    "check_smi_products.mjs",
    "check_specific_products.mjs",
    "check_stats_table.mjs",
    "check_supabase.js",
    "check_weird_names.js",
    "count_by_category.js",
    "count_products.js",
    "create_stats_table.sql",
    "CSV_IMPORT_README.md",
    "debug.js",
    "debug_names.js",
    "delete_all_products.js",
    "delete_no_images.js",
    "delete_pinned_products.js",
    "delete_unpinned_products.js",
    "DISCORD_SETUP.md",
    "electronics.csv",
    "export_products_by_itemid.js",
    "extract_perfumes.js",
    "extract_tracking_data.ps1",
    "find_screenshot_products.js",
    "fix_all_categories.js",
    "fix_all_categories_advanced.js",
    "fix_broken_products.mjs",
    "fix_broken_products_v2.mjs",
    "fix_categories.js",
    "fix_categories_via_api.js",
    "fix_chinese_names.js",
    "fix_jordan_names.mjs",
    "fix_nullable_columns.sql",
    "fix_products_table.sql",
    "fix_product_names.js",
    "fix_spaced_names.js",
    "GEMINI.md",
    "generate_jackets_discord_mapping.mjs",
    "generate_jackets_for_discord_bot.mjs",
    "import_accessories.js",
    "import_all_accessories.js",
    "import_all_jackets.js",
    "import_all_pants_hoodies.js",
    "import_all_shoes.js",
    "import_all_tshirts_shorts.js",
    "import_electronics.js",
    "import_from_csv.js",
    "import_jackets.js",
    "import_new_csv.js",
    "import_pants_hoodies.js",
    "import_shoes.js",
    "import_tshirts_shorts.js",
    "inspect_weird.js",
    "INSTRUKCJA_DODAWANIA_PRODUKTOW.md",
    "jackets.csv",
    "jackets_discord_mapping.txt",
    "jackets_for_discord_bot.txt",
    "jackets_ready_to_paste.txt",
    "list_all_categories.js",
    "list_pinned_products.mjs",
    "merge_jackets_to_bot.mjs",
    "pants_hoodies.csv",
    "pinned_products_restore.txt",
    "popular_products_to_import.txt",
    "products_to_import.csv",
    "product_links.txt",
    "reset_stats.js",
    "restore_deleted.js",
    "restore_from_csv.js",
    "revert_sweaters.js",
    "scrape_from_links.js",
    "scrape_names_backup.mjs",
    "scrape_shop.js",
    "scrape_shop_api.js",
    "scrape_shop_auto.js",
    "se1-itemexport-1653718259-20260619220330.csv",
    "se1-itemexport-1679502043-20260610000353.csv",
    "se1-itemexport-1679502043-20260619024109.csv",
    "set_unpinned_to_best.js",
    "shoes_products.csv",
    "test-17track-hsd.js",
    "test-17track.js",
    "test-extra-ips.js",
    "test_brand_decoding.js",
    "test_db.js",
    "test_decode_fix.js",
    "test_picksly.js",
    "test_picksly2.js",
    "test_picksly_multiple.js",
    "test_picksly_popular.js",
    "test_picksly_scan.js",
    "test_qc.js",
    "tracking_response.html",
    "tshirts_shorts.csv",
    "unpin_all_products.mjs",
    "update_products_from_csv.js",
    "update_product_names.js"
)

# Directories to delete
$dirsToDelete = @(
    "PopularBatchFeature",
    "REUSABLE_MODULES",
    "SCRAPER_DOCS",
    "TEMPLATE-IMPORT-PACKAGE",
    "TEMPLATE_IMPORT_PACKAGE",
    "jpg",
    "images"
)

$deletedCount = 0

# Delete files
foreach ($file in $filesToDelete) {
    $path = Join-Path $PSScriptRoot $file
    if (Test-Path $path) {
        Remove-Item $path -Force
        Write-Host "Deleted: $file" -ForegroundColor Green
        $deletedCount++
    }
}

# Delete directories
foreach ($dir in $dirsToDelete) {
    $path = Join-Path $PSScriptRoot $dir
    if (Test-Path $path) {
        Remove-Item $path -Recurse -Force
        Write-Host "Deleted directory: $dir" -ForegroundColor Green
        $deletedCount++
    }
}

# Delete ZIP file
$zipPath = Join-Path $PSScriptRoot "TEMPLATE_IMPORT_PACKAGE.zip"
if (Test-Path $zipPath) {
    Remove-Item $zipPath -Force
    Write-Host "Deleted: TEMPLATE_IMPORT_PACKAGE.zip" -ForegroundColor Green
    $deletedCount++
}

Write-Host ""
Write-Host "Cleanup complete! Deleted $deletedCount items." -ForegroundColor Cyan
