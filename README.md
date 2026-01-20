# QC Ticket Analyzer

A web-based tool for analyzing and categorizing QC (Quality Control) tickets. Upload CSV files, run automated categorization across 39 standard categories, and download professional Excel reports.

## Features

- **CSV Upload**: Drag-and-drop or click to upload QC ticket CSV files
- **Experience Mappings**: Optional CSV for reviewer/product information
- **4 Analysis Types**:
  - Overall Analysis (all 39 categories)
  - Dimensions Specific (3 categories)
  - Factory Specific (17 categories)
  - Label Specific (2 categories)
- **Automated Categorization**: Rule-based categorization without AI
- **XLSX Export**: Professional Excel reports with:
  - Dashboard with metrics and breakdowns
  - Separate sheets for each category
  - Dev vs Factory breakdown
  - Issue Type breakdown
  - Public Preview Links

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm

### Installation

```bash
cd ticket-analyzer
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Build

```bash
npm run build
npm start
```

## Deployment to Vercel

This project is ready for Vercel deployment:

1. Push to GitHub
2. Connect to Vercel
3. Deploy automatically

Or use the Vercel CLI:

```bash
npm i -g vercel
vercel
```

## CSV Format Requirements

### QC Tickets CSV (Required)

Required columns:
- `Ticket ID`
- `Ticket name`
- `Ticket description`
- `Experience name`
- `Experience ID`
- `Ticket status`
- `Assignee`
- `Associated Experience`
- `Backstage Experience page`

### Experience Mappings CSV (Optional)

Columns:
- `ProductName`
- `Assignee` (reviewer)
- `ProductType`
- `TemplateName`

## 39 Categories

The system categorizes tickets into these categories:

1. Action video edit
2. Action video framing
3. BBOX issue
4. Bad close up sequence
5. Bad close up sequence - bad framing
6. Bad close up sequence - repetitive edits
7. Bad copy
8. Bad label - framing
9. Bad label - set up
10. Bad label artifact
11. Bad unbox artifact
12. Black frames in video
13. Blurry/out of focus video
14. Color correction - Action shot
15. Color correction - other
16. Color correction - transparent product
17. Color correction - white product
18. Damage/dirty plate
19. Damaged product
20. Date code/LOT number shown
21. Dimensions alignment
22. Dimensions - mixed values
23. Dimensions using a set shot
24. Dimensions/product name mismatch
25. Feature crop
26. Feature not matching copy
27. Inconsistent color
28. Incorrect dimension values
29. Missing dimension values
30. Missing navigation item
31. Missing set in intro/360
32. New issue
33. Off centered / Off axis
34. PDP mismatch
35. Reflections on product
36. Repetitive copy
37. Repetitive features
38. UI obstruction
39. Un-seamless 360 loop
40. Visible stage / equipment
41. Visual glitches

## Categorization Logic

### Golden Rule
If ticket name exactly matches a category name (case-insensitive), use that category immediately.

### Priority Order
1. **Visual/Background Issues** (checked first)
   - BBOX issues
   - Visible stage/equipment
   - Visual glitches
   - Color correction issues

2. **Specific Content Issues**
   - Label issues
   - Close-up sequence issues
   - Copy/text issues
   - Action video issues
   - Dimension issues (checked last)

## Future Enhancements

Planned features:
- PDF dashboard exports
- Configurable rules and categories
- Persistent settings storage
- Week-over-week comparison

## Tech Stack

- **Framework**: Next.js 16 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **CSV Parsing**: PapaParse
- **Excel Export**: SheetJS (xlsx)
- **Icons**: Lucide React

## License

MIT
