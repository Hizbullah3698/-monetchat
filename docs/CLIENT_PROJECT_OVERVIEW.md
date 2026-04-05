# PickPic - Project Overview

## AI-Powered Marketplace for Kuwait

**Prepared for:** Fahad & Team
**Date:** February 2026
**Version:** 1.0

---

## What We're Building

PickPic is a **modern marketplace app** that works like ChatGPT - but for buying and selling. Instead of browsing through categories and filters like traditional apps (e.g., "Kuwait For Sale"), users simply **tell the AI what they want** using text, voice, or images.

### The Experience

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│   👤 User: "I want a Mercedes GLE under 6000 KWD"          │
│                                                             │
│   🤖 AI: "I found 5 Mercedes GLE listings for you:"        │
│                                                             │
│   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐       │
│   │ [Image]     │  │ [Image]     │  │ [Image]     │       │
│   │ GLE 350     │  │ GLE 450     │  │ GLE 350     │       │
│   │ 5,500 KWD   │  │ 5,800 KWD   │  │ 5,200 KWD   │       │
│   │ Ahmed Motors│  │ Premium Auto│  │ Star Cars   │       │
│   │ [📞 CALL]   │  │ [📞 CALL]   │  │ [📞 CALL]   │       │
│   └─────────────┘  └─────────────┘  └─────────────┘       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Key Features (V1 - Kuwait Launch)

### 1. Chat-to-Buy Interface

- **Text Chat**: Type what you want to find
- **Voice Input**: Speak in Arabic or English (important for Arabic users)
- **Image Search**: Upload a photo to find similar items
- **Smart Responses**: AI understands your needs and shows relevant products

### 2. Direct Seller Contact

- **No In-App Messaging**: Simplified flow
- **Click-to-Call**: Buyer calls seller directly
- **WhatsApp Option**: Alternative contact method
- **Fast Deals**: Reduces friction, closes deals faster

### 3. Easy Listing for Sellers

- **AI-Assisted**: Upload photos, AI writes the listing
- **Auto-Category**: AI assigns the right category
- **Content Moderation**: AI checks for prohibited items
- **Simple Form**: Title, Price, Description, Photos, Done!

### 4. Regional Compliance

- **Kuwait Laws**: AI blocks prohibited items (alcohol, weapons, etc.)
- **Arabic + English**: Full language support
- **Local Currency**: Prices in KWD
- **Location Aware**: Shows products in user's area

### 5. Location Features

- **Auto-Detect**: App knows user's location
- **Manual Override**: User can switch to another city/country
- **Regional Filtering**: Products filtered by location

---

## Technology Stack

| Component     | Technology      | Purpose                           |
| ------------- | --------------- | --------------------------------- |
| App Framework | Next.js         | Fast, modern web app              |
| Database      | PostgreSQL      | Store users, products, sellers    |
| AI Search     | Qdrant + OpenAI | Smart product matching            |
| Voice         | OpenAI Whisper  | Arabic/English speech recognition |
| Images        | AWS S3          | Store product photos              |
| Hosting       | Windows Server  | Your existing server              |

---

## User Roles (V1)

### Buyer

- Search for products via chat
- Use voice or text
- Call sellers directly
- No account required to browse
- Register with email + password (optional)

### Seller

- Register with email + password
- Add phone number for buyer contact
- Create product listings
- Receive calls from buyers
- Manage their listings

### Admin (Backend Only)

- Manage categories
- View analytics
- Handle disputes (if any)
- _Full admin panel in V2_

---

## Development Timeline

### Day 1: Foundation

| Days  | Focus        | Deliverable                 |
| ----- | ------------ | --------------------------- |
| Day 1 | Setup        | Database, AI services ready |
| Day 1 | Backend APIs | All APIs functional         |

### Day 2: User Interface

| Days  | Focus          | Deliverable              |
| ----- | -------------- | ------------------------ |
| Day 2 | Chat Interface | Working chat with AI     |
| Day 2 | Seller Flow    | Create & manage listings |

### Day 3: Polish & Launch

| Days  | Focus            | Deliverable           |
| ----- | ---------------- | --------------------- |
| Day 3 | Arabic & RTL     | Full localization     |
| Day 3 | Testing & Deploy | **Production Launch** |

---

## Milestones & Checkpoints

| Milestone          | Target Date | What You'll See             |
| ------------------ | ----------- | --------------------------- |
| **Test Link v1**   | Day 5       | Basic chat + search working |
| **Test Link v2**   | Day 10      | Full buyer + seller flow    |
| **Arabic Version** | Day 12      | Complete Arabic support     |
| **Production**     | Day 14      | Live app in Kuwait          |

---

## What Makes This Different from "Kuwait For Sale"

| Feature       | Kuwait For Sale      | PickPic                  |
| ------------- | -------------------- | ------------------------ |
| Search Method | Categories + Filters | **AI Chat**              |
| Input         | Text only            | **Text + Voice + Image** |
| Language      | Arabic/English       | **AI understands both**  |
| Contact       | In-app messaging     | **Direct Call**          |
| Listing       | Manual form          | **AI-assisted**          |
| Moderation    | Manual review        | **AI automatic**         |

---

## How Search Works

### Traditional App

```
1. User opens app
2. Browses categories: Vehicles → Cars → Mercedes
3. Sets filters: Price, Year, Model
4. Scrolls through results
5. Clicks to message seller
6. Waits for response
```

### PickPic (AI-Powered)

```
1. User opens app
2. Says: "أبي مرسيدس GLE تحت ٦٠٠٠ دينار" (or types it)
3. AI instantly shows matching cars
4. User taps "Call" → Talks to seller
5. Deal done!
```

---

## Content Moderation (Automatic)

The AI automatically blocks prohibited items based on Kuwait/Saudi laws:

| Category | Examples                         | Action      |
| -------- | -------------------------------- | ----------- |
| Alcohol  | Beer, Wine, Spirits              | ❌ Rejected |
| Weapons  | Guns, Ammunition                 | ❌ Rejected |
| Drugs    | Narcotics, Prohibited substances | ❌ Rejected |
| Pork     | Pork products                    | ❌ Rejected |
| Adult    | Inappropriate content            | ❌ Rejected |

Sellers see a clear rejection reason. No manual moderation needed.

---

## Future Roadmap (Post V1)

### V2 Features

- Admin Dashboard UI
- Seller Analytics
- Payment Integration
- Rating & Reviews
- Promoted Listings

### V3 Features

- Saudi Arabia Launch
- More Countries
- Mobile Apps (iOS/Android)
- Advanced AI Features

---

## Testing Checklist for V1

### As a Buyer

- [ ] Can chat with AI to find products
- [ ] Can use voice in Arabic
- [ ] Can use voice in English
- [ ] Can upload image to search
- [ ] Can call seller directly
- [ ] Can switch language (AR/EN)
- [ ] Can change location

### As a Seller

- [ ] Can register with email + password
- [ ] Can add phone number for contact
- [ ] Can create listing with photos
- [ ] AI suggests title/description
- [ ] Prohibited items are blocked
- [ ] Can edit/delete listings
- [ ] Receives calls from buyers

---

## Questions & Answers

**Q: How long until we have a test link?**
A: 2-3 days for basic functionality, 5 days for full test version.

**Q: Will it work on mobile?**
A: Yes, it's a responsive web app that works on all devices.

**Q: What about iOS/Android apps?**
A: V1 is web-only. Native apps planned for V3.

**Q: How accurate is the Arabic voice recognition?**
A: We use OpenAI Whisper - best-in-class for Arabic, including Gulf dialects.

**Q: What happens if AI makes a mistake in moderation?**
A: Sellers can contact support. Admin can manually approve items.

**Q: Can we add more prohibited items later?**
A: Yes, the rules are configurable per country.

---

## Contact & Support

For any questions during development:

- **Technical Issues**: Ali & Dev Team
- **Business Requirements**: Fahad

---

_This document will be updated as the project progresses._

---

## Appendix: Screen Mockups

### Home Screen (Chat Interface)

```
┌─────────────────────────────────────────┐
│  🇰🇼 Kuwait City    [AR|EN]    👤       │
├─────────────────────────────────────────┤
│                                         │
│                                         │
│         Welcome to PickPic! 👋          │
│                                         │
│    Tell me what you're looking for      │
│                                         │
│    ┌─────────────────────────────┐     │
│    │ 🚗 "I need a car"           │     │
│    └─────────────────────────────┘     │
│    ┌─────────────────────────────┐     │
│    │ 📱 "iPhone 15 Pro"          │     │
│    └─────────────────────────────┘     │
│    ┌─────────────────────────────┐     │
│    │ 🏠 "Apartment in Salmiya"   │     │
│    └─────────────────────────────┘     │
│                                         │
│                                         │
├─────────────────────────────────────────┤
│  [📷] [Type your message...]    [🎤]   │
└─────────────────────────────────────────┘
```

### Product Card

```
┌─────────────────────────────────────────┐
│  ┌─────────────────────────────────┐   │
│  │                                 │   │
│  │         [Car Image]            │   │
│  │                                 │   │
│  └─────────────────────────────────┘   │
│                                         │
│  2023 Mercedes GLE 350                 │
│  مرسيدس GLE 350 2023                   │
│                                         │
│  💰 5,500 KWD                          │
│  📍 Kuwait City                        │
│  👤 Ahmed Motors                       │
│                                         │
│  ┌─────────────┐  ┌─────────────┐     │
│  │ 📞 Call     │  │ 💬 WhatsApp │     │
│  └─────────────┘  └─────────────┘     │
└─────────────────────────────────────────┘
```

### Seller Listing Form

```
┌─────────────────────────────────────────┐
│  ← Create Listing                       │
├─────────────────────────────────────────┤
│                                         │
│  📷 Add Photos                          │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐      │
│  │ +   │ │ img │ │ img │ │ img │      │
│  └─────┘ └─────┘ └─────┘ └─────┘      │
│                                         │
│  ✨ AI Suggestion:                      │
│  "2023 Mercedes GLE 350 - Excellent     │
│   condition, low mileage"               │
│  [Use This] [Edit]                      │
│                                         │
│  Title                                  │
│  ┌─────────────────────────────────┐   │
│  │ 2023 Mercedes GLE 350           │   │
│  └─────────────────────────────────┘   │
│                                         │
│  Price (KWD)                           │
│  ┌─────────────────────────────────┐   │
│  │ 5,500                           │   │
│  └─────────────────────────────────┘   │
│                                         │
│  Description                           │
│  ┌─────────────────────────────────┐   │
│  │ Excellent condition...          │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │        📤 Post Listing          │   │
│  └─────────────────────────────────┘   │
│                                         │
└─────────────────────────────────────────┘
```

---

_Document prepared by the Development Team_
_February 2026_
