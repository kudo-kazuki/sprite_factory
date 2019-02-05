var gulp = require('gulp');
var sass = require('gulp-sass');
var plumber = require('gulp-plumber');

// SassとCssの保存先を指定
gulp.task('sass', function(){
	return gulp.src('src/styles/*.scss')
		.pipe(plumber())
		.pipe(sass({outputStyle: 'compressed'}))
		.pipe(gulp.dest('src/styles/'));
});

gulp.task('watch', function(){
	gulp.watch('src/styles/*.scss', gulp.series('sass'));
	console.log('watchするよ。');
});


gulp.task('default', gulp.series('watch'));
