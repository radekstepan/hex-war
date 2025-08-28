export const TILE_WIDTH = 120;
export const TILE_HEIGHT = 90;
export const TILE_GAP = 30;
export const CAPITAL_REINFORCEMENT_BONUS = 2;
export const TURNS_TO_ENTRENCH = 2;
export const ENTRENCHMENT_DEFENSE_BONUS = 1;

export const AI_DIFFICULTIES = ['Easy', 'Normal', 'Hard'];

export const territoriesData = {
    // North America
    'alaska': { name: 'Alaska', continent: 'North America', gridX: 0, gridY: 0, adj: ['kamchatka', 'northwest-territory', 'alberta'] },
    'northwest-territory': { name: 'N.W. Territory', continent: 'North America', gridX: 1, gridY: 0, adj: ['alaska', 'alberta', 'ontario', 'greenland'] },
    'greenland': { name: 'Greenland', continent: 'North America', gridX: 3, gridY: 0, adj: ['northwest-territory', 'ontario', 'quebec', 'iceland'] },
    'alberta': { name: 'Alberta', continent: 'North America', gridX: 1, gridY: 1, adj: ['alaska', 'northwest-territory', 'ontario', 'western-us'] },
    'ontario': { name: 'Ontario', continent: 'North America', gridX: 2, gridY: 1, adj: ['northwest-territory', 'greenland', 'quebec', 'eastern-us', 'western-us', 'alberta'] },
    'quebec': { name: 'Quebec', continent: 'North America', gridX: 3, gridY: 1, adj: ['greenland', 'ontario', 'eastern-us'] },
    'western-us': { name: 'Western US', continent: 'North America', gridX: 1, gridY: 2, adj: ['alberta', 'ontario', 'eastern-us', 'central-america'] },
    'eastern-us': { name: 'Eastern US', continent: 'North America', gridX: 2, gridY: 2, adj: ['ontario', 'quebec', 'western-us', 'central-america'] },
    'central-america': { name: 'Central America', continent: 'North America', gridX: 1, gridY: 3, adj: ['western-us', 'eastern-us', 'venezuela'] },
    
    // South America
    'venezuela': { name: 'Venezuela', continent: 'South America', gridX: 2, gridY: 4, adj: ['central-america', 'peru', 'brazil'] },
    'peru': { name: 'Peru', continent: 'South America', gridX: 2, gridY: 5, adj: ['venezuela', 'brazil', 'argentina'] },
    'brazil': { name: 'Brazil', continent: 'South America', gridX: 3, gridY: 5, adj: ['venezuela', 'peru', 'argentina', 'north-africa'] },
    'argentina': { name: 'Argentina', continent: 'South America', gridX: 2, gridY: 6, adj: ['peru', 'brazil'] },
    
    // Europe
    'iceland': { name: 'Iceland', continent: 'Europe', gridX: 4, gridY: 0, adj: ['greenland', 'great-britain', 'scandinavia'] },
    'scandinavia': { name: 'Scandinavia', continent: 'Europe', gridX: 5, gridY: 0, adj: ['iceland', 'great-britain', 'northern-europe', 'ukraine', 'siberia'] }, // FIXED: Added Siberia
    'great-britain': { name: 'Great Britain', continent: 'Europe', gridX: 4, gridY: 1, adj: ['iceland', 'scandinavia', 'northern-europe', 'western-europe'] },
    'northern-europe': { name: 'Northern Europe', continent: 'Europe', gridX: 5, gridY: 1, adj: ['great-britain', 'scandinavia', 'western-europe', 'southern-europe', 'ukraine'] },
    'western-europe': { name: 'Western Europe', continent: 'Europe', gridX: 4, gridY: 2, adj: ['great-britain', 'northern-europe', 'southern-europe', 'north-africa'] },
    'southern-europe': { name: 'Southern Europe', continent: 'Europe', gridX: 5, gridY: 2, adj: ['northern-europe', 'western-europe', 'ukraine', 'middle-east', 'egypt', 'north-africa'] },
    'ukraine': { name: 'Ukraine', continent: 'Europe', gridX: 6, gridY: 1, adj: ['scandinavia', 'northern-europe', 'southern-europe', 'ural', 'afghanistan', 'middle-east'] },
    
    // Africa
    'north-africa': { name: 'North Africa', continent: 'Africa', gridX: 4, gridY: 4, adj: ['brazil', 'western-europe', 'southern-europe', 'egypt', 'east-africa', 'congo'] },
    'egypt': { name: 'Egypt', continent: 'Africa', gridX: 5, gridY: 3, adj: ['southern-europe', 'north-africa', 'east-africa', 'middle-east'] },
    'east-africa': { name: 'East Africa', continent: 'Africa', gridX: 5, gridY: 4, adj: ['egypt', 'north-africa', 'congo', 'south-africa', 'madagascar', 'middle-east'] },
    'congo': { name: 'Congo', continent: 'Africa', gridX: 4, gridY: 5, adj: ['north-africa', 'east-africa', 'south-africa'] },
    'south-africa': { name: 'South Africa', continent: 'Africa', gridX: 4, gridY: 6, adj: ['congo', 'east-africa', 'madagascar'] },
    'madagascar': { name: 'Madagascar', continent: 'Africa', gridX: 5, gridY: 6, adj: ['south-africa', 'east-africa'] },
    
    // Asia
    'ural': { name: 'Ural', continent: 'Asia', gridX: 7, gridY: 1, adj: ['ukraine', 'siberia', 'china', 'afghanistan'] },
    'siberia': { name: 'Siberia', continent: 'Asia', gridX: 7, gridY: 0, adj: ['ural', 'yakutsk', 'irkutsk', 'mongolia', 'china', 'scandinavia'] }, // FIXED: Added Scandinavia
    'yakutsk': { name: 'Yakutsk', continent: 'Asia', gridX: 8, gridY: 0, adj: ['siberia', 'irkutsk', 'kamchatka'] },
    'kamchatka': { name: 'Kamchatka', continent: 'Asia', gridX: 9, gridY: 0, adj: ['yakutsk', 'irkutsk', 'mongolia', 'japan', 'alaska'] },
    'irkutsk': { name: 'Irkutsk', continent: 'Asia', gridX: 8, gridY: 1, adj: ['siberia', 'yakutsk', 'kamchatka', 'mongolia'] },
    'mongolia': { name: 'Mongolia', continent: 'Asia', gridX: 8, gridY: 2, adj: ['siberia', 'irkutsk', 'kamchatka', 'japan', 'china'] },
    'japan': { name: 'Japan', continent: 'Asia', gridX: 9, gridY: 2, adj: ['kamchatka', 'mongolia'] },
    'afghanistan': { name: 'Afghanistan', continent: 'Asia', gridX: 7, gridY: 2, adj: ['ukraine', 'ural', 'china', 'india', 'middle-east'] },
    'china': { name: 'China', continent: 'Asia', gridX: 8, gridY: 3, adj: ['afghanistan', 'ural', 'siberia', 'mongolia', 'siam', 'india'] }, // FIXED: Moved right
    'middle-east': { name: 'Middle East', continent: 'Asia', gridX: 6, gridY: 3, adj: ['southern-europe', 'ukraine', 'afghanistan', 'india', 'east-africa', 'egypt'] },
    'india': { name: 'India', continent: 'Asia', gridX: 7, gridY: 3, adj: ['middle-east', 'afghanistan', 'china', 'siam'] }, // FIXED: Moved up
    'siam': { name: 'Siam', continent: 'Asia', gridX: 8, gridY: 4, adj: ['india', 'china', 'indonesia'] },
    
    // Australia
    'indonesia': { name: 'Indonesia', continent: 'Australia', gridX: 8, gridY: 5, adj: ['siam', 'new-guinea', 'western-australia'] },
    'new-guinea': { name: 'New Guinea', continent: 'Australia', gridX: 9, gridY: 5, adj: ['indonesia', 'eastern-australia', 'western-australia'] },
    'western-australia': { name: 'Western Australia', continent: 'Australia', gridX: 8, gridY: 6, adj: ['indonesia', 'eastern-australia', 'new-guinea'] },
    'eastern-australia': { name: 'Eastern Australia', continent: 'Australia', gridX: 9, gridY: 6, adj: ['new-guinea', 'western-australia'] },
};

export const continentsData = {
    'North America': { bonus: 5, color: 'rgba(245, 201, 25, 0.1)' }, 'South America': { bonus: 2, color: 'rgba(223, 134, 4, 0.1)' }, 'Europe': { bonus: 5, color: 'rgba(29, 102, 219, 0.1)' }, 'Africa': { bonus: 3, color: 'rgba(128, 85, 43, 0.1)' }, 'Asia': { bonus: 7, color: 'rgba(34, 139, 34, 0.1)' }, 'Australia': { bonus: 2, color: 'rgba(107, 33, 108, 0.1)' },
};

export const PLAYER_COLORS = [
    '#38a169', // Green
    '#2c5282', // Blue
    '#c53030', // Red
    '#d69e2e', // Yellow
    '#805ad5', // Purple
    '#dd6b20' // Orange
];
