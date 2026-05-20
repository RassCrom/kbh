import maplibregl from 'maplibre-gl';

export function buildParsedYearExpr(): any[] {
  return [
    'let',
    'y_int', ['get', 'year_int'],
    'y_str', ['coalesce', ['get', 'year_str'], ''],
    [
      'let',
      'dash_idx', ['index-of', '-', ['var', 'y_str']],
      [
        'case',
        ['!=', ['var', 'y_int'], null],
        ['to-number', ['var', 'y_int'], 0],

        ['!=', ['var', 'y_str'], ''],
        [
          'case',
          ['!=', ['var', 'dash_idx'], -1],
          [
            '/',
            [
              '+',
              ['to-number', ['slice', ['var', 'y_str'], 0, ['var', 'dash_idx']], 0],
              ['to-number', ['slice', ['var', 'y_str'], ['+', ['var', 'dash_idx'], 1]], 0]
            ],
            2
          ],
          ['to-number', ['var', 'y_str'], 0]
        ],
        0
      ]
    ]
  ];
}

export function buildYearColorExpr(): maplibregl.ExpressionSpecification {
  const parsedYear = buildParsedYearExpr();

  return [
    'case',
    ['!=', parsedYear, 0],
    [
      'step',
      parsedYear,
      '#8B2635',        // < 1917  Russian Empire
      1917, '#D32F2F',  // 1917–1935  Early Soviet / Constructivism
      1936, '#C47A24',  // 1936–1952  Stalinist era
      1953, '#5E9E6A',  // 1953–1963  Khrushchev Thaw
      1964, '#4A7BAA',  // 1964–1984  Brezhnev Stagnation
      1985, '#7B4D9E',  // 1985–1990  Late Soviet / Perestroika
      1991, '#A07840',  // 1991–1996  Early Independence
      1997, '#007A9A',  // 1997–2006  Capital Founding
      2007, '#00AFCA',  // 2007–2018  Capital Boom & EXPO
      2019, '#F5B82E',  // 2019+      Tokayev era
    ],
    '#242424',          // Unknown (year = 0)
  ] as unknown as maplibregl.ExpressionSpecification;
}

export function buildCombinedFilter(
  yearRange: [number, number],
  types: string[],
  districts: string[],
  archStyle: string,
  company: string
): any[] {
  const parsedYear = buildParsedYearExpr();
  const conditions: any[] = [
    ['any',
      ['==', parsedYear, 0],
      ['all',
        ['>=', parsedYear, yearRange[0]],
        ['<=', parsedYear, yearRange[1]]
      ]
    ]
  ];

  if (types.length > 0) {
    conditions.push(['match', ['get', 'type'], types, true, false]);
  }
  if (districts.length > 0) {
    conditions.push(['match', ['get', 'district'], districts, true, false]);
  }
  if (archStyle) {
    conditions.push(['==', ['get', 'arch_style'], archStyle]);
  }
  if (company) {
    conditions.push(['==', ['get', 'construction_company'], company]);
  }

  return ['all', ...conditions];
}
