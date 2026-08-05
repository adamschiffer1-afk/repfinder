# Requirements Document

## Introduction

This document specifies the requirements for adding Ossbuy converter support to the RepFinder application, setting it as the default agent, and displaying a promotional banner for Ossbuy's shipping discount. RepFinder is a tool for finding replica products from Chinese platforms (Weidian, Taobao, 1688) and converting product links to affiliate links for various shopping agents. This feature will add Ossbuy as the 9th supported agent, make it the default choice for users, and promote a -50% shipping discount through a daily banner.

## Glossary

- **Converter**: The system component that transforms Chinese platform product URLs into agent affiliate URLs
- **Agent**: A third-party shopping service that helps users purchase products from Chinese platforms
- **Ossbuy**: A shopping agent service with the domain ossbuy.com
- **Affiliate_Code**: A unique identifier (MJH4PLSK) used to track referrals and commissions
- **Product_Link**: A URL pointing to a product on a Chinese platform (Weidian, Taobao, 1688, Tmall)
- **Item_ID**: The unique identifier for a product on a Chinese platform
- **SUPPORTED_AGENTS**: An array of agent configuration objects containing value, label, and icon properties
- **Default_Agent**: The agent that is pre-selected in the user interface when no explicit choice has been made
- **RepFinder**: The application system that provides product search and link conversion functionality
- **Promotional_Banner**: A modal overlay component that displays marketing messages to users
- **Calendar_Day**: A 24-hour period from 00:00:00 to 23:59:59 in the user's local timezone
- **Dismissal_Timestamp**: A date string stored in browser localStorage indicating when a user dismissed the promotional banner

## Requirements

### Requirement 1: Add Ossbuy to Converter Function

**User Story:** As a user, I want to convert Chinese platform links to Ossbuy affiliate links, so that I can purchase products through Ossbuy with my affiliate code

#### Acceptance Criteria

1. WHEN the convertLink function receives a Product_Link string and 'ossbuy' string as the target parameter, THE Converter SHALL return a URL string in the format `https://www.ossbuy.com/product-detail?url={encoded_product_url}&spider_token=4572&inviteCode=MJH4PLSK`
2. WHEN the Product_Link contains an Item_ID AND the platform is one of Weidian, Taobao, 1688, or Tmall, THE Converter SHALL include the complete original Product_Link in the url parameter regardless of Item_ID presence
3. WHEN the Product_Link does not contain an Item_ID, THE Converter SHALL include the complete original Product_Link in the url parameter
4. WHEN the convertLink function receives an empty string, null, or whitespace-only Product_Link, THE Converter SHALL return an empty string
5. THE Converter SHALL encode the Product_Link using JavaScript's encodeURIComponent function before including it in the url parameter
6. THE Converter SHALL include spider_token with the constant string value '4572' in all generated Ossbuy links
7. THE Converter SHALL include inviteCode with the Affiliate_Code value 'MJH4PLSK' in all generated Ossbuy links

### Requirement 2: Add Ossbuy to Supported Agents List

**User Story:** As a user, I want to see Ossbuy as an available agent option, so that I can select it from the agent dropdown

#### Acceptance Criteria

1. THE SUPPORTED_AGENTS array SHALL contain an entry object for Ossbuy with a value property string set to 'ossbuy'
2. THE Ossbuy entry object SHALL have a label property string set to 'Ossbuy'
3. THE Ossbuy entry object SHALL have an icon property string pointing to '/images/ossbuy.png'
4. THE SUPPORTED_AGENTS array SHALL contain exactly 9 agent entries after adding Ossbuy
5. THE SUPPORTED_AGENTS array SHALL maintain the existing 8 agent entries with their value, label, and icon properties unchanged
6. THE Ossbuy entry SHALL be positioned as the last element (index 8) in the SUPPORTED_AGENTS array

### Requirement 3: Set Ossbuy as Default Agent

**User Story:** As a user, I want Ossbuy to be pre-selected as my agent, so that I don't have to manually select it each time

#### Acceptance Criteria

1. WHEN a user interface component that displays an agent selector is initially rendered AND no stored preference exists, THE RepFinder SHALL set the string value 'ossbuy' as the initially selected value in that component
2. WHEN no user preference string is found in browser localStorage under key 'preferredAgent', THE RepFinder SHALL use the string value 'ossbuy' as the Default_Agent
3. WHEN a user preference string exists in browser localStorage under key 'preferredAgent', THE RepFinder SHALL use that stored value instead of the Default_Agent
4. THE RepFinder SHALL replace all string literal occurrences of 'kakobuy' used as default initialization values with the string literal 'ossbuy' in components ProductDetail.jsx, Products.jsx, and LinkConverter.jsx
5. WHEN a user explicitly selects a different agent value through the UI, THE RepFinder SHALL update the browser localStorage 'preferredAgent' value to the user's selection
6. WHEN a user explicitly selects a different agent value, THE RepFinder SHALL not override that selection with the Default_Agent value until the next component mount where no localStorage preference exists
7. IF browser localStorage is unavailable or throws an error, THE RepFinder SHALL fall back to using the Default_Agent value 'ossbuy' without throwing an error

### Requirement 4: Provide Ossbuy Logo Asset

**User Story:** As a developer, I want an Ossbuy logo image to be available, so that it displays correctly in the agent selector

#### Acceptance Criteria

1. THE RepFinder SHALL include an image file named 'ossbuy.png' in the '/public/images/' directory
2. THE image file SHALL be in PNG format with a .png file extension
3. THE image file SHALL have width and height dimensions between 100 and 500 pixels
4. THE image file SHALL have an aspect ratio between 1:2 and 2:1 (width:height)
5. WHEN the SUPPORTED_AGENTS array references '/images/ossbuy.png' AND the file exists, THE RepFinder SHALL render the img element with a src attribute set to '/images/ossbuy.png' in the agent selector UI
6. WHEN the SUPPORTED_AGENTS array references '/images/ossbuy.png' AND the file does not exist, THE RepFinder SHALL hide the img element or render it with broken image styling consistent with existing agent logo error handling

### Requirement 5: Display Ossbuy Promotional Banner

**User Story:** As a user, I want to see a promotional banner for Ossbuy's shipping discount, so that I'm aware of the special offer when visiting the site

#### Acceptance Criteria

1. WHEN a user visits the RepFinder site AND no banner dismissal timestamp exists in localStorage for the current calendar day, THE RepFinder SHALL display a modal overlay banner promoting Ossbuy
2. THE banner SHALL display the message "Obecnie -50% na wysyłkę w OssBuy!" as the primary promotional text
3. THE banner SHALL include a call-to-action button with text "Zarejestruj się w OssBuy" that links to the URL string 'https://ossbuy.allapp.link/d9pi65h0b4mnp0ou7sog'
4. WHEN the banner is displayed, THE RepFinder SHALL wait 3000 milliseconds (3 seconds) before showing the close button (X icon)
5. WHEN the user clicks the close button (X icon) after the 3-second delay, THE RepFinder SHALL hide the banner and store the current date timestamp in browser localStorage under key 'ossbuyBannerDismissed'
6. WHEN the user clicks the call-to-action button, THE RepFinder SHALL open the registration URL in a new browser tab and store the current date timestamp in browser localStorage under key 'ossbuyBannerDismissed'
7. WHEN the user returns to the site on a subsequent day (different calendar date), THE RepFinder SHALL display the banner again regardless of previous dismissals
8. THE banner SHALL use the Ossbuy logo image file from '/public/images/ossbuy.png' in the banner design
9. IF browser localStorage is unavailable or throws an error, THE RepFinder SHALL display the banner on every page load without persistence

### Requirement 6: Maintain Backward Compatibility

**User Story:** As an existing user, I want all existing agent converters to continue working, so that my workflow is not disrupted

#### Acceptance Criteria

1. WHEN the convertLink function receives any of the existing 8 agent targets, THE Converter SHALL generate the correct affiliate URL for that agent
2. THE Converter SHALL preserve the existing URL structure for KakoBuy, USFans, AllChinaBuy, LitBuy, MuleBuy, OopBuy, GTBuy, and HipoBuy
3. THE Converter SHALL maintain the existing Item_ID extraction logic for all platforms (Weidian, Taobao, 1688, Tmall)
4. WHEN the Converter encounters a Kakobuy wrapper URL, THE Converter SHALL continue to extract the nested Product_Link correctly
5. THE SUPPORTED_AGENTS array SHALL continue to provide all existing agent configurations with their original value, label, and icon properties
