# twelve-to-twentyfour [![Build Status](https://travis-ci.org/radiovisual/twelve-to-twentyfour.svg)](https://travis-ci.org/radiovisual/twelve-to-twentyfour)
> Convert 12-hour time strings into 24-hour time strings. `02:00 PM` → `14:00`

## Install

```sh
$ npm install twelve-to-twentyfour
```

## Usage

```js
var twentyfour = require('twelve-to-twentyfour');

twentyfour("1:01 PM");
// => "13:01"

twentyfour("12:04 AM");
// => "00:04"

twentyfour("4:04:04 PM");
// => "16:04:04"

```

## Notes

This module can accept time strings in the following formats:

- `00:00 XX`
- `00:00XX`
- `0:00XX`
- `0:00 XX`

Where `XX` equals a case-insensitive `AM` or `PM`.

## Related 

- [twentyfour-to-twelve](https://github.com/radiovisual/twentyfour-to-twelve) Convert 24-hour time strings into 12-hour time strings. `14:00` → `02:00 PM`

## License

MIT @ [Michael Wuergler](http://www.numetriclabs.com)
