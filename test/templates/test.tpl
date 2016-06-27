<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">

<html>
	<head>
		<title>This is test template for {engineName} template engine.</title>
	</head>
	<body>
		{# some cool comment here}		
		
		{.render templates/header}
		
		<div class="content">
			
			{# another cool comment}
			
			{.repeat artists as artist}
			
			<table>
				{.repeat artist.albums as album}
				<tr>
					<td>{album.name}</td>
					<td><img src="{album.coverImage}" alt="{album.name}" /></td>
					<td>
						<ul>
							{.repeat album.tracks as track}
							<li>{artist.name} - {track.name} : {track.length}</li>
							{.end}
						</ul>
					</td>
				</tr>
				{.end}
			</table>
			
			{.end}
			
		</div>

		<hr />

		{.define test}
			{.if lvl}
			<div style="padding: 10px 10px 20px 10px; border: 1px solid black;">
			<h2>test</h2>
				<h3>{lvl.name}</h3>				
				{.render :test lvl}
			</div>
			{.end}
		{.end}


		{.render :test}

		<div class="content">
			{.define cblock}
			<ul>
				{.repeat comments as comment}
					<li>
						<h2>{comment.title} - {comment.author}</h2>
						{.if comment}
							<div class="subcomments">
								{#render :comments, comment.comments}
								{.render :cblock comment}
							</div>
						{.end}
					</li>
				{.end}
			</ul>
			{.end}
			{.render :cblock}
		</div>

		<hr>

		{.if hello == 'world'}
			<h3>Hello world</h3>
		{.or}
			<h3>Wow, something's wrong.</h3>
		{.end}

		{.if hello}
			<h3>Hello!</h3>
		{.or}
			<h3>Wow, something's wrong again.</h3>
		{.end}		
		
		{.if hello == '123'}
			<h3>123</h3>
		{.or}
			<h3>OK</h3>
		{.end}
		
		{#render footer}
	</body>
</html>




<!-- 
	
	var artists = [
		{
			name: 'Eminem',
			albums: [
				{
					name: 'Marshal Mathers LP.',
					tracks: [
						{ 
							name: 'The Way I Am',
							length: '4:50'
						}
					]
				}
			]
		}
	];
	
	
-->