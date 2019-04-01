const FS = require('fs');
const JIMP = require('jimp');

var app = new Vue({
	el: '#app',

	data: function() {
        return {
            imageList: [],
            selectDirPath: '',
            inputFileView: true,
            loadingMessage: '処理中です',
            loadingFlg: false,
            spriteInfo: {
                width: 0,
                height: 0,
                frameWidth: 0,
                flameNum: 0,
                path: '',
                createFlg: false
            },
            animationInfo: {
                duration: 0,
                delay: 0,
                iteration_count: 'infinite',
                direction: 'normal',
                fill_mode: 'none',
                timing_function: {
                    kind: 'step',
                    step: 0,
                    cubic: [0,0,0,0],
                    result: 'steps(0)'
                },
                outPutCss: '',
                outPutCssWithStyle: '',
                outPutKeyframes: ''
            }
        }
	},

    methods: {
        onFileChange(e){
            let files = e.target.files || e.dataTransfer.files;

            if (!files.length) {
                return;
            }

            this.imageList = [];
            this.inputFileView  = true;
            this.setLoadingAnime(true, '読み込み中です');

            let fileSplit = files[0].path.split(/\\/);//選択したディレクトリの1つ目のファイルのフルパスに対して\で分割する
            let dirPath   = '';//ディレクトリのパスを格納する

            for(let i = 0; i < fileSplit.length - 1; i++){
                dirPath += fileSplit[i] + '\\';
            }

			this.selectDirPath = dirPath;
            this.createImage(files);
        },

        createImage(files) {
            var vm = this;
            var imageInfoResult = {};
            var imageReaderPromise = [];

            this.resetSpriteInfo();

            for(let i = 0; i < files.length; i++){
                //1つ1つ処理のpromise化しまっせ
                imageReaderPromise[i] = new Promise(function(resolve, reject){
                    let reader = new FileReader();
                    reader.onloadend = function(e) {
                        let imageInfo = {
                            'src' : e.target.result,
                            'name': files[i].name,
                            'path': files[i].path
                        };
                        imageInfoResult[i] = imageInfo;
                        resolve();
                    };
                    reader.readAsDataURL(files[i]);
                });
            }

            //全てのPromiseオブジェクトがresolveされたタイミングでvueのdataに突っ込む
            Promise.all(imageReaderPromise).then(function(){
                for(var i in imageInfoResult){
                    vm.$set(vm.imageList, i, imageInfoResult[i]);
                }
                vm.setLoadingAnime(false, '');
            });
        },

        //ローディングアニメーション表示。trueで表示falseで非表示
        setLoadingAnime(flg, message){
            this.loadingFlg = flg;
            this.loadingMessage = message;
        },

        removeImage: function(e) {
            this.imageList = '';
            this.selectDirPath = '';
        },

        canselSprite(){
            this.imageList = '';
            this.selectDirPath = '';
            this.inputFileView = false;
            this.resetSpriteInfo();
            this.$nextTick(function(){
                this.inputFileView = true;
            });
        },

        resetSpriteInfo(){
            this.spriteInfo.width      = 0;
            this.spriteInfo.height     = 0;
            this.spriteInfo.frameWidth = 0;
            this.spriteInfo.flameNum   = 0;
            this.spriteInfo.path       = '';
            this.spriteInfo.createFlg  = false;
            this.animationInfo.outPutKeyframes = '';
        },

        /*ここから実際のsprite生成メソッドだよ*/
        createSprite: function(){
            if(!this.imageList.length){
                alert('画像がセットされていません');
                return false;
            }

            if(this.imageList.length === 1){
                alert('画像が1つしかありません');
                return false;
            }

            this.resetSpriteInfo();

            this.setLoadingAnime(true, '処理中です');

            var vm = this;
            var jimps = [];

            //tmp画像作成
            new JIMP(1, 1, 'transparent', function(err, image){}).write(vm.selectDirPath + 'tmp.png', function() {
                jimps.push(JIMP.read(vm.selectDirPath + 'tmp.png'));
            });

            //読み込んだ画像をtmpも含めてjimpに読み込む
            for(let i in this.imageList) {
                jimps.push(JIMP.read(vm.imageList[i].path));
            }

            Promise.all(jimps).then(function(data) {
                return Promise.all(jimps);
            }).then(function(data) {
                /*最初に巨大な透明画像を作る。*/
                var maxHeight = 0;
                var totalWidth = 0;

                for(let i = 0; i < jimps.length - 1; i++){
                    if(data[i].bitmap.height > maxHeight){
                        maxHeight = data[i].bitmap.height;
                    }
                    totalWidth += data[i].bitmap.width;
                }


                data[jimps.length - 1].resize(totalWidth, maxHeight).composite(data[0], 0, 0);//1枚目をセット

                var xCoordinateImage = 0;
                for(let i = 1; i < jimps.length - 1; i++){
                    xCoordinateImage += data[i-1].bitmap.width;
                    data[jimps.length - 1].composite(data[i], xCoordinateImage, 0);//2枚目以降をセット
                }

                data[jimps.length - 1].write(vm.selectDirPath + 'sprite.png', function() {
                    console.log('作成');
                    vm.spriteInfo.width      = totalWidth;
                    vm.spriteInfo.height     = maxHeight;
                    vm.spriteInfo.frameWidth = data[1].bitmap.width;
                    vm.spriteInfo.flameNum   = data.length - 1;
                    vm.spriteInfo.path       = vm.selectDirPath + 'sprite.png';
                    vm.spriteInfo.createFlg  = true;

                    vm.animationInfo.outPutKeyframes = '<style>\n@keyframes spriteAnimation{\nto{\ntransform: translate3d(-' + vm.spriteInfo.width + 'px, 0, 0);\n}\n}\n</style>';
                    vm.animationInfo.timing_function.step = vm.spriteInfo.flameNum;
                    vm.setTimingFunctionStep();
                });

                //最初に生成したtmpはゴミなので消します。
                FS.unlink(vm.selectDirPath + 'tmp.png', function(err){
                    console.log(err);
                });


                vm.setLoadingAnime(false, '');
                alert('完了しました！');
            });
        },

        createdSpriteShow: function(){

        },

        setTimingFunctionStep(){
            this.animationInfo.timing_function.result = 'steps(' + this.animationInfo.timing_function.step + ')';
            this.setAnimationInfoOutPutCss();
        },

        setTimingFunctionCubic(){
            this.animationInfo.timing_function.result = 'cubic-bezier(' + 
                this.animationInfo.timing_function.cubic[0] + ', ' +
                this.animationInfo.timing_function.cubic[1] + ', ' +
                this.animationInfo.timing_function.cubic[2] + ', ' +
                this.animationInfo.timing_function.cubic[3] +
            ')';
            this.setAnimationInfoOutPutCss();
        },

        setAnimationInfoOutPutCss(){
            this.animationInfo.outPutCss = '';
            this.animationInfo.outPutCss += 'animation-duration: ' + this.animationInfo.duration + 's' + ';\n';
            this.animationInfo.outPutCss += 'animation-timing-function: ' + this.animationInfo.timing_function.result + ';\n';
            this.animationInfo.outPutCss += 'animation-delay: ' + this.animationInfo.delay + 's' + ';\n';
            this.animationInfo.outPutCss += 'animation-iteration-count: ' + this.animationInfo.iteration_count + ';\n';
            this.animationInfo.outPutCss += 'animation-direction: ' + this.animationInfo.direction + ';\n';
            this.animationInfo.outPutCss += 'animation-fill-mode: ' + this.animationInfo.fill_mode + ';';
            this.animationInfo.outPutCssWithStyle = '<style>#spriteAnimationImg{animation-name: spriteAnimation;'+ this.animationInfo.outPutCss +'}</style>'
        }
    },

    mounted: function() {
        this.$nextTick(function() {
            this.setAnimationInfoOutPutCss();
        });
    }
});


