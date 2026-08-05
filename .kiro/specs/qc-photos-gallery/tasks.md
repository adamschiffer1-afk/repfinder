# Implementation Plan: QC Photos Gallery

## Overview

This plan implements a sophisticated QC (Quality Check) Photos Gallery system for product detail pages in the Next.js e-commerce application. The implementation includes:

- Frontend gallery component with thumbnail cards and category filtering
- Full-screen carousel viewer with zoom and navigation capabilities
- Admin interface for uploading, categorizing, and managing QC photos
- Backend API endpoints for photo upload, retrieval, deletion, and reordering
- Database schema extensions for QC photo metadata storage
- Image processing pipeline for optimization and thumbnail generation
- Responsive design for mobile, tablet, and desktop devices
- Accessibility features including keyboard navigation and screen reader support

The implementation follows the existing Next.js patterns, uses TypeScript for type safety, and integrates with the current MongoDB database and Sharp image processing library.

## Tasks

- [~] 1. Extend database schema and create types
  - Create TypeScript interfaces for QCPhoto, PhotoGroup, ColorVariant, PhotoCategory
  - Extend Product model in `/src/models/Product.js` to include qcPhotos array field
  - Add compound index for efficient variant-based queries
  - Create validation schema for QC photo metadata
  - _Requirements: 15.1, 6.1, 7.1_

- [ ] 2. Implement API endpoints for QC photo operations
  - [-] 2.1 Create upload endpoint at `/src/app/api/qc-photos/upload/route.js`
    - Implement authentication and admin authorization check
    - Add file type validation (JPEG, PNG, WEBP, GIF)
    - Add file size validation (max 10MB)
    - Generate unique filename using UUID and timestamp
    - Process images with Sharp: optimize original (max 1920px, quality 85%) and generate thumbnail (300px, quality 80%)
    - Save files to `/public/qc-photos/{productId}/{variantId}/` directory structure
    - Calculate next order value for variant and update Product document
    - Return photo metadata with success response
    - _Requirements: 6.1, 6.2, 6.3, 9.2, 10.4, 12.1, 12.2, 12.3, 12.4, 15.1, 15.2, 15.4_
  
  - [ ]* 2.2 Write property test for upload file type validation
    - **Property 9: File Type Validation**
    - **Validates: Requirements 9.3, 12.1, 12.3**
  
  - [ ]* 2.3 Write property test for file size validation
    - **Property 10: File Size Validation**
    - **Validates: Requirements 12.2**
  
  - [-] 2.4 Create GET endpoint at `/src/app/api/qc-photos/route.js`
    - Support query parameters: productId (required), variantId (optional), category (optional)
    - Fetch Product document and filter qcPhotos array based on query params
    - Group photos by variant and return with variant metadata
    - Return photos sorted by order field
    - _Requirements: 1.1, 15.3_
  
  - [ ]* 2.5 Write property test for photo grouping by variant
    - **Property 1: Photo Grouping by Color Variant**
    - **Validates: Requirements 1.1, 6.4**
  
  - [ ]* 2.6 Write property test for category filtering correctness
    - **Property 4: Category Filtering Correctness**
    - **Validates: Requirements 1.3, 3.3**
  
  - [-] 2.7 Create DELETE endpoint at `/src/app/api/qc-photos/[photoId]/route.js`
    - Implement authentication and admin authorization check
    - Find Product and photo entry by photoId
    - Delete files from storage (original and thumbnail)
    - Remove photo entry from Product.qcPhotos array
    - Reorder remaining photos in variant to maintain sequence
    - Return success response
    - _Requirements: 11.1, 11.3, 11.4, 11.5_
  
  - [ ] 2.8 Create PATCH endpoint at `/src/app/api/qc-photos/reorder/route.js`
    - Implement authentication and admin authorization check
    - Accept productId, variantId, and array of photoOrders
    - Update order field for each photo in the variant
    - Save Product document
    - _Requirements: 8.1, 8.3, 8.4_
  
  - [ ]* 2.9 Write property test for photo order preservation
    - **Property 5: Photo Order Preservation**
    - **Validates: Requirements 8.1, 8.4**
  
  - [x] 2.10 Create PATCH endpoint at `/src/app/api/qc-photos/[photoId]/route.js` for metadata updates
    - Implement authentication and admin authorization check
    - Accept productId, category (optional), altText (optional)
    - Find and update photo entry in Product.qcPhotos
    - Return updated photo metadata
    - _Requirements: 7.1, 7.4, 7.5_
  
  - [ ]* 2.11 Write property test for category assignment persistence
    - **Property 11: Category Assignment Persistence**
    - **Validates: Requirements 7.3**

- [~] 3. Checkpoint - Ensure API tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 4. Implement frontend gallery components
  - [~] 4.1 Create ThumbnailCard component at `/src/components/qc-gallery/ThumbnailCard.jsx`
    - Display first photo from photo group as thumbnail using Next.js Image
    - Show color variant label
    - Conditionally render PhotoCountBadge if photo count > 1
    - Conditionally render "View all (N)" link if photo count >= 2
    - Add click handler to open carousel viewer
    - Implement responsive image sizing
    - Add keyboard accessibility (Tab, Enter)
    - _Requirements: 2.1, 2.2, 2.3, 18.1, 18.3_
  
  - [ ]* 4.2 Write property test for thumbnail display and photo counting
    - **Property 2: Thumbnail Display and Photo Counting**
    - **Validates: Requirements 2.1, 2.2, 2.3**
  
  - [ ]* 4.3 Write property test for View All link visibility
    - **Property 16: View All Link Visibility**
    - **Validates: Requirements 18.1, 18.3**
  
  - [~] 4.4 Create CategoryFilter component at `/src/components/qc-gallery/CategoryFilter.jsx`
    - Render tab-based interface for category selection
    - Always include "All" tab as first tab
    - Display photo count for each category
    - Handle category change events
    - Add active tab visual indication with 3:1 contrast ratio
    - Implement keyboard navigation (Arrow keys, Tab, Enter)
    - Add ARIA labels for accessibility
    - _Requirements: 3.1, 3.2, 3.3, 16.3_
  
  - [~] 4.5 Create QCPhotosGallery component at `/src/components/qc-gallery/QCPhotosGallery.jsx`
    - Accept productId, colorVariants, and qcPhotos as props
    - Implement groupPhotosByVariant utility function
    - Implement filterPhotosByCategory utility function
    - Manage selectedCategory state
    - Manage carousel modal state (isCarouselOpen, carouselData)
    - Render CategoryFilter component
    - Render grid of ThumbnailCard components
    - Display total photo count across all groups
    - Handle category filter changes with <300ms update
    - Hide gallery if no QC photos exist
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.4, 2.5, 3.3, 3.5_
  
  - [ ]* 4.6 Write property test for total photo count accuracy
    - **Property 3: Total Photo Count Accuracy**
    - **Validates: Requirements 2.5**
  
  - [ ]* 4.7 Write unit tests for QCPhotosGallery component
    - Test gallery renders correctly with photos
    - Test gallery hides when no photos exist
    - Test category filtering updates display
    - Test thumbnail card click opens carousel
    - _Requirements: 1.4, 3.5_

- [ ] 5. Implement carousel viewer components
  - [~] 5.1 Create CarouselViewer component at `/src/components/qc-gallery/CarouselViewer.jsx`
    - Accept isOpen, photos, initialIndex, onClose as props
    - Manage currentIndex state for photo navigation
    - Manage zoomLevel state (100-300%)
    - Manage panPosition state for zoomed images
    - Implement full-screen modal container with overlay
    - Render MainPhotoDisplay component
    - Render NavigationControls component (Previous/Next)
    - Render ThumbnailStrip component at bottom
    - Render close button with click and Escape key handlers
    - Implement focus trap when modal is open
    - Prevent body scroll when modal is open
    - Return focus to triggering element on close
    - Add smooth transitions (200-400ms) between photos
    - _Requirements: 4.1, 4.2, 4.8, 4.9, 14.5, 16.2, 16.5, 16.6, 16.7_
  
  - [~] 5.2 Create MainPhotoDisplay component at `/src/components/qc-gallery/MainPhotoDisplay.jsx`
    - Display current photo at large size using Next.js Image
    - Implement ZoomControls sub-component with +/- buttons
    - Handle zoom level changes (100% to 300%)
    - Handle mouse wheel zoom on desktop
    - Handle pinch-to-zoom on mobile devices
    - Handle double-tap to toggle zoom (100% ↔ 200%)
    - Enable pan/drag when zoomed (>100%)
    - Display current photo index and total count
    - Add alt text for accessibility
    - _Requirements: 4.2, 5.1, 5.2, 5.3, 5.4, 14.2_
  
  - [~] 5.3 Create NavigationControls component at `/src/components/qc-gallery/NavigationControls.jsx`
    - Render Previous button (left arrow)
    - Render Next button (right arrow)
    - Disable/hide Previous button when at first photo
    - Disable/hide Next button when at last photo
    - Handle Arrow key navigation (Left/Right)
    - Add ARIA labels for screen readers
    - _Requirements: 4.3, 4.4, 4.5, 16.2_
  
  - [~] 5.4 Create ThumbnailStrip component at `/src/components/qc-gallery/ThumbnailStrip.jsx`
    - Display horizontal scrollable strip of thumbnails
    - Render thumbnail for each photo in current group
    - Highlight currently active thumbnail
    - Handle thumbnail click to navigate to that photo
    - Auto-scroll to keep active thumbnail visible
    - Support horizontal scroll on all devices
    - _Requirements: 4.6, 4.7, 14.4_
  
  - [ ]* 5.5 Write property test for thumbnail strip completeness
    - **Property 14: Carousel Thumbnail Strip Completeness**
    - **Validates: Requirements 4.6**
  
  - [ ]* 5.6 Write property test for zoom level reset on navigation
    - **Property 15: Zoom Level Reset on Navigation**
    - **Validates: Requirements 5.5**
  
  - [~] 5.7 Implement touch gesture support for mobile devices
    - Add swipe left/right handlers for photo navigation
    - Add pinch-to-zoom handler using touch events
    - Add double-tap handler for zoom toggle
    - Use passive event listeners for scroll performance
    - _Requirements: 14.1, 14.2_
  
  - [ ]* 5.8 Write unit tests for carousel viewer components
    - Test carousel opens and displays correct photo
    - Test Previous/Next navigation works correctly
    - Test thumbnail strip navigation works
    - Test zoom controls work
    - Test Escape key closes carousel
    - Test focus trap when open
    - _Requirements: 4.1, 4.8, 16.2, 16.6, 16.7_

- [~] 6. Checkpoint - Ensure frontend component tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 7. Integrate gallery into product detail page
  - [~] 7.1 Update product detail page at `/src/app/products/[slug]/page.jsx`
    - Add server-side fetch for QC photos during page generation
    - Pass productId, colorVariants, and qcPhotos to QCPhotosGallery component
    - Import and render QCPhotosGallery component below product details section
    - Position gallery below the existing "Udostępnij" (Share) button
    - Ensure gallery doesn't render if no QC photos exist
    - _Requirements: 1.4, 15.3_
  
  - [ ]* 7.2 Write integration test for gallery on product page
    - Test gallery displays when QC photos exist
    - Test gallery doesn't render when no QC photos
    - Test clicking thumbnail opens carousel
    - _Requirements: 1.4_

- [ ] 8. Implement admin upload interface
  - [~] 8.1 Create admin QC photos page at `/src/app/admin-99x-hsd/products/[id]/qc-photos/page.jsx`
    - Implement authentication check (admin only)
    - Fetch product and existing QC photos on page load
    - Display ProductSelector component (if managing multiple products)
    - Display VariantSelector component
    - Render UploadZone component
    - Render PhotoManagementGrid component
    - Manage selectedVariant state
    - Manage photos state grouped by variant
    - Handle variant selection changes
    - _Requirements: 6.1, 6.4, 6.5_
  
  - [~] 8.2 Create UploadZone component at `/src/components/admin/qc-photos/UploadZone.jsx`
    - Implement DragDropHandler for file drag-and-drop
    - Provide visual feedback when drag is active
    - Implement FilePickerButton for click-to-upload
    - Handle file selection from both drag-drop and file picker
    - Validate files (type and size) before upload
    - Manage uploadQueue state
    - Manage uploadProgress state (Map of file names to progress)
    - Call upload API endpoint for each file
    - Display upload progress indicators
    - Display error messages for failed uploads
    - Show which files succeeded and which failed
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 10.1, 10.2, 10.3, 10.4, 10.5, 17.1, 17.2, 17.3, 17.5_
  
  - [ ]* 8.3 Write property test for multi-file upload processing
    - **Property 8: Multi-File Upload Processing**
    - **Validates: Requirements 6.3, 9.2, 9.4, 10.4**
  
  - [ ]* 8.4 Write property test for error message specificity
    - **Property 17: Error Message Specificity**
    - **Validates: Requirements 12.5, 17.1, 17.2, 17.3, 17.5**
  
  - [~] 8.5 Create PhotoManagementGrid component at `/src/components/admin/qc-photos/PhotoManagementGrid.jsx`
    - Display existing QC photos grouped by color variant
    - Render PhotoCard component for each photo
    - Support drag-and-drop reordering of photos within variant
    - Call reorder API endpoint on drag end
    - Implement optimistic UI updates for reordering
    - Handle reorder errors and revert on failure
    - _Requirements: 6.4, 8.1, 8.2, 8.3_
  
  - [ ]* 8.6 Write property test for order persistence after reordering
    - **Property 6: Order Persistence After Reordering**
    - **Validates: Requirements 8.3**
  
  - [~] 8.7 Create PhotoCard component at `/src/components/admin/qc-photos/PhotoCard.jsx`
    - Display photo thumbnail
    - Render CategoryDropdown for category assignment
    - Render DragHandle for reordering
    - Render DeleteButton with confirmation dialog
    - Handle category change and call metadata update API
    - Handle delete confirmation and call delete API
    - Implement optimistic UI updates for deletion
    - Display photo order number
    - _Requirements: 7.1, 7.4, 7.5, 8.1, 11.1, 11.2, 11.3, 11.5_
  
  - [ ]* 8.8 Write property test for sequential insertion ordering
    - **Property 7: Sequential Insertion Ordering**
    - **Validates: Requirements 8.5**
  
  - [ ]* 8.9 Write unit tests for admin upload interface
    - Test file drag-and-drop triggers upload
    - Test file picker selection triggers upload
    - Test invalid file type shows error
    - Test file size exceeded shows error
    - Test photo reordering updates order
    - Test category change updates photo
    - Test delete confirmation and removal
    - _Requirements: 9.1, 9.3, 10.1, 12.2, 7.5, 11.2, 11.3_

- [ ] 9. Implement responsive design and styling
  - [~] 9.1 Create responsive grid styles for QCPhotosGallery
    - Mobile (<768px): 2 columns, gap 12px
    - Tablet (768-1024px): 3 columns, gap 16px
    - Desktop (>1024px): 4 columns, gap 20px
    - Use CSS Grid for layout
    - Maintain aspect ratios to prevent distortion
    - Adapt layout within 300ms on viewport change
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5_
  
  - [~] 9.2 Create responsive styles for CarouselViewer
    - Full-screen modal on all devices
    - Mobile: Single photo with swipe navigation
    - Tablet: Visible thumbnail strip at bottom
    - Desktop: Prominent controls and thumbnail strip
    - Scrollable thumbnail strip on narrow devices
    - _Requirements: 14.3, 14.4_
  
  - [~] 9.3 Implement lazy loading for gallery images
    - Use Next.js Image component with lazy loading
    - Load images as they enter viewport
    - Show thumbnail while full image loads (progressive loading)
    - Serve responsive image sizes based on viewport
    - _Requirements: 15.5_
  
  - [ ]* 9.4 Write unit tests for responsive behavior
    - Test grid layout changes at breakpoints
    - Test carousel adapts to screen size
    - Test touch gestures work on mobile
    - _Requirements: 13.5, 14.3_

- [ ] 10. Implement accessibility features
  - [~] 10.1 Add keyboard navigation support
    - Gallery: Tab through thumbnail cards, Enter to open carousel
    - Carousel: Arrow keys for navigation, Escape to close, Tab through controls
    - Category filter: Arrow keys to switch tabs, Enter to select
    - Admin interface: Full keyboard support for upload and management
    - _Requirements: 16.2, 18.5_
  
  - [~] 10.2 Add ARIA labels and semantic HTML
    - Use semantic HTML elements (nav, button, dialog)
    - Add ARIA labels to all interactive controls
    - Add alt text to all images (use photo altText field)
    - Maintain proper heading hierarchy
    - Add role="dialog" to carousel modal
    - Add aria-live regions for dynamic content updates
    - _Requirements: 16.1, 16.4, 16.5_
  
  - [~] 10.3 Implement focus management
    - Add visible focus indicators with 3:1 contrast ratio
    - Implement focus trap in carousel modal
    - Return focus to triggering element on carousel close
    - Manage focus for admin dialogs (delete confirmation)
    - _Requirements: 16.3, 16.6, 16.7_
  
  - [ ]* 10.4 Write accessibility tests
    - Test keyboard navigation works for all components
    - Test ARIA labels are present
    - Test focus indicators are visible
    - Test screen reader announcements work
    - _Requirements: 16.2, 16.3, 16.5_

- [ ] 11. Implement error handling and validation
  - [~] 11.1 Add client-side error handling for upload operations
    - Display toast notifications for transient errors
    - Display inline errors for validation errors
    - Show error list for batch upload failures
    - Implement retry mechanism with exponential backoff
    - Set upload timeout to 30 seconds with timeout error message
    - _Requirements: 17.1, 17.2, 17.3, 17.4_
  
  - [~] 11.2 Add server-side error handling for API endpoints
    - Return appropriate HTTP status codes (400, 401, 403, 404, 413, 500)
    - Return consistent error response format with success, error, code fields
    - Implement file type validation with magic number verification
    - Implement storage cleanup on processing errors
    - Implement database rollback on storage failures
    - Log errors server-side for monitoring
    - _Requirements: 12.4, 17.1, 17.2, 17.3_
  
  - [~] 11.3 Add graceful degradation for edge cases
    - Display placeholder image if photo URL returns 404
    - Show "Unable to load photos" message on API failures
    - Provide refresh button for failed loads
    - Log missing photos for cleanup investigation
    - Detect browser capabilities (drag-drop, WebP, touch) and adapt UI
    - _Requirements: 15.3_
  
  - [ ]* 11.4 Write unit tests for error handling
    - Test upload validation errors display correctly
    - Test network error retry logic works
    - Test timeout handling works
    - Test server error responses are handled
    - _Requirements: 17.1, 17.2, 17.3, 17.5_

- [ ] 12. Final checkpoint - Integration testing and verification
  - [~] 12.1 Verify complete user workflow on product detail page
    - Customer can view QC photos grouped by variant
    - Customer can filter photos by category
    - Customer can open carousel and navigate photos
    - Customer can zoom into photos and pan
    - Gallery works on mobile, tablet, and desktop
    - _Requirements: 1.1, 1.2, 3.1, 4.1, 5.1, 13.1, 13.2, 13.3_
  
  - [~] 12.2 Verify complete admin workflow
    - Admin can access admin QC photos page
    - Admin can select product and variant
    - Admin can upload photos via drag-drop
    - Admin can upload photos via file picker
    - Admin can assign categories to photos
    - Admin can reorder photos within variant
    - Admin can delete photos
    - _Requirements: 6.1, 6.2, 7.1, 8.1, 9.1, 10.1, 11.1_
  
  - [~] 12.3 Verify data persistence and retrieval
    - Uploaded photos are saved with correct metadata
    - Photos are retrieved grouped by variant
    - Photo order is preserved
    - Category assignments persist
    - Deleted photos are removed from storage and database
    - _Requirements: 7.3, 8.3, 8.4, 11.3, 11.4, 15.1_
  
  - [~] 12.4 Verify performance and optimization
    - Product detail page loads with QC photos within 1 second
    - Thumbnails load before full-resolution images
    - Images are properly optimized (Sharp processing)
    - Lazy loading works correctly
    - Category filter updates within 300ms
    - Carousel transitions are smooth (200-400ms)
    - _Requirements: 3.5, 4.9, 15.2, 15.3, 15.4, 15.5_
  
  - [~] 12.5 Verify accessibility compliance
    - All interactive elements are keyboard accessible
    - Focus indicators are visible
    - Screen reader announcements work
    - ARIA labels are present and correct
    - Semantic HTML structure is maintained
    - _Requirements: 16.1, 16.2, 16.3, 16.4, 16.5, 16.6, 16.7_
  
  - [ ]* 12.6 Write end-to-end integration tests
    - Test complete customer workflow from gallery to carousel
    - Test complete admin workflow from upload to display
    - Test photo filtering and navigation
    - Test error recovery scenarios
    - _Requirements: All requirements_

- [~] 13. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Property-based tests validate universal correctness properties defined in the design
- Unit tests validate specific examples, edge cases, and component behavior
- Integration tests validate end-to-end workflows and system behavior
- The implementation follows Next.js App Router patterns with server and client components
- TypeScript is used throughout for type safety
- Sharp library (already in dependencies) is used for image processing
- MongoDB with Mongoose is used for data persistence
- The design uses embedded array structure for QC photos within Product documents
- Checkpoints ensure incremental validation and allow for user questions

## Task Dependency Graph

```json
{
  "waves": [
    {
      "id": 0,
      "tasks": ["1.1"]
    },
    {
      "id": 1,
      "tasks": ["2.1", "2.4", "2.7", "2.8", "2.10"]
    },
    {
      "id": 2,
      "tasks": ["2.2", "2.3", "2.5", "2.6", "2.9", "2.11"]
    },
    {
      "id": 3,
      "tasks": ["4.1", "4.4"]
    },
    {
      "id": 4,
      "tasks": ["4.2", "4.3", "4.5"]
    },
    {
      "id": 5,
      "tasks": ["4.6", "4.7"]
    },
    {
      "id": 6,
      "tasks": ["5.1", "5.2", "5.3", "5.4", "5.7"]
    },
    {
      "id": 7,
      "tasks": ["5.5", "5.6", "5.8"]
    },
    {
      "id": 8,
      "tasks": ["7.1"]
    },
    {
      "id": 9,
      "tasks": ["7.2"]
    },
    {
      "id": 10,
      "tasks": ["8.1", "8.2", "8.5", "8.7"]
    },
    {
      "id": 11,
      "tasks": ["8.3", "8.4", "8.6", "8.8", "8.9"]
    },
    {
      "id": 12,
      "tasks": ["9.1", "9.2", "9.3"]
    },
    {
      "id": 13,
      "tasks": ["9.4"]
    },
    {
      "id": 14,
      "tasks": ["10.1", "10.2", "10.3"]
    },
    {
      "id": 15,
      "tasks": ["10.4"]
    },
    {
      "id": 16,
      "tasks": ["11.1", "11.2", "11.3"]
    },
    {
      "id": 17,
      "tasks": ["11.4"]
    },
    {
      "id": 18,
      "tasks": ["12.1", "12.2", "12.3", "12.4", "12.5"]
    },
    {
      "id": 19,
      "tasks": ["12.6"]
    }
  ]
}
```
