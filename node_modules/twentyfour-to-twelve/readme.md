# twentyfour-to-twelve [![Build Status](https://travis-ci.org/radiovisual/twentyfour-to-twelve.svg)](https://travis-ci.org/radiovisual/twentyfour-to-twelve)
> Convert 24-hour time strings into 12-hour time strings. `14:00` → `02:00 PM`

## Install

```sh
$ npm install --save twentyfour-to-twelve
```

## Usage

```js
var twelve = require('twentyfour-to-twelve');

twelve("23:01");
// => "11:01 PM"

twelve("14:04:00");
// => "02:04:00 PM"
```

## Related

- [twelve-to-twentyfour](https://github.com/radiovisual/twelve-to-twentyfour) Convert 12-hour time strings into 24-hour time strings. `02:00 PM` → `14:00`

## License

MIT @ [Michael Wuergler](http://www.numetriclabs.com)
