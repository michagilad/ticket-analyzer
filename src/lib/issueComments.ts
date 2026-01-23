// Issue descriptions for Excel comments
// Extracted from QC Bugs Categories.docx

export const ISSUE_COMMENTS: Record<string, string> = {
  'Action video edit': 'When the action video demonstration has a poor edit or demonstration.',
  
  'Action video framing': 'When the action video demonstration is poorly positioned in frame / main part of the demonstration is cropped, zoomed in or positioned poorly.',
  
  'Bad close up sequence - bad framing': 'When the crop/zoom in the Close Up Sequence looks bad.',
  
  'Bad close up sequence - repetitive edits': 'When the close ups edits in the Close Up Sequence are too repetitive.',
  
  'Bad close up sequence': 'Any other issue with the Close Up Sequence that doesn\'t fit to any of the other 2 categories above',
  
  'Bad copy': 'Any issue with bad capitalization, special characters or illogical copy.',
  
  'Bad label - framing': 'When the Label shot gets too cropped or is too zoomed out and unreadable.',
  
  'Bad label - set up': 'When the label shot has a problematic setup that creates a bad label artifact.',
  
  'Bad label artifact': 'Any issues with label artifact that doesn\'t fit into any of the 2 categories above.',
  
  'Bad unbox artifact': 'Any issues with unbox artifact, including when the unbox artifact has 2 setup that are too similar',
  
  'BBOX issue': 'When there are white obstructions on the product (caused by bad calculation of the bounding box).',
  
  'Black frames in video': 'When the video blacks out completely and includes black frames.',
  
  'Blurry/out of focus video': 'When the video is too blurry or out of focus',
  
  'Color correction - white product': 'When the product is white or very bright, and the color comes out bad. It may be that the product blends into the background, or it has a very milky look, or it might create a lot of visual glitches and a very dark color correction. The focus here is on color of the product itself, not the color correction.',
  
  'Color correction - transparent product': 'When the product is transparent. May result in product blending into background, or rainbow colored visual glitches or other glitches. The focus here is on color of the product itself, not the color correction.',
  
  'Color correction - Action shot': 'When only the action shot has bad color correction (very dark and saturated, or very light and milky, or off/tinted colors), or action shot has a completely separate color correction issue then the other shots (rare)',
  
  'Color correction - other': 'Over type of color correction issues- colorful products, saturated, very dark, etc.',
  
  'Date code/LOT number shown': 'The expiration date or the LOT numbers are visible on the product. Either on the product itself, or on the label setup in the label shot.',
  
  'Inconsistent color': 'When different shots in the experience has passable color correction, but it\'s not consistent across the experience.',
  
  'Damage/dirty plate': 'When there are distracting dirty/damages on plate',
  
  'Damaged product': 'When there\'s significant distracting damage to the product or product is dirty.',
  
  'Dimensions alignment': 'When the dimension artifact composition is not well aligned with the product.',
  
  'Dimensions - mixed values': 'To be used when the dimensions seem correct but are swapped between the axises.',
  
  'Dimensions using a set shot': 'When the dimensions artifact is using a set shot or a multipackage',
  
  'Dimensions/product name mismatch': 'When the dimensions artifact has values that are not matching product name in more then 1inch difference.',
  
  'Feature crop': 'When the video for a feature is badly cropped, positioned, framed. Too zoomed in or too zoomed out or out of frame and looks bad.',
  
  'Feature not matching copy': 'When a feature copy mentions a specific element of the product that is not visible in the feature video.',
  
  'Incorrect dimension values': 'When the dimension artifact has clearly wrong or swapped dimension values.',
  
  'Missing dimension values': 'When dimensions artifact shows 0x0x0',
  
  'Missing navigation item': 'When there\'s an issue with the structure and a navigation item is missing, like no "Features" button.',
  
  'Missing set in intro/360': 'When the item is a set/multipack and it is not showed properly as such in the intro/360 part.',
  
  'New issue': 'Any issue that doesn\'t fit into any existing category. Please be as specific as possible in the description so we can identify and understand the issue.',
  
  'Off centered / Off axis': 'When item is placed off center or off axis.',
  
  'PDP mismatch': 'When the product in video is different then product in PDP',
  
  'Reflections on product': 'When there are significant distracting reflections on the product.',
  
  'Repetitive copy': 'When copy across different features is too repetitive.',
  
  'Repetitive features': 'When the video across different features is too repetitive.',
  
  'UI obstruction': 'When the UI text box obscures important parts of the product.',
  
  'Un-seamless 360 loop': 'When the 360 doesn\'t loop seamlessly.',
  
  'Visible stage / equipment': 'When studio equipment or the rotating plate is visible. Should open ticket for visible plate only when it\'s very bad. Slightly visible is passable',
  
  'Visual glitches': 'When there are significant visible visual glitches in video',
};
