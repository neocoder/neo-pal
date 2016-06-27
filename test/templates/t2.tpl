1		{# some cool comment here}		
2		
3		Title: {title}
4		
5		One, two, three: {one.two.three}
6		TS: {.timestamp}

{.repeat artists as artist}
	-> {artist.name}
{.end}
-------------------
{.css main, grids, some-cool-buttons}
-------------------
{.render templates/header}
-------------------
1
{.if artists.1.name}
2 - {artists.1.name}
{.or}
3 -- {.timestamp} -- {title}
{.end}
4