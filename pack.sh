DIST_VERSION=$(node -e "console.log(require('./package.json').version)")
DIST_PATH="./builds/aventura.v$DIST_VERSION.tar.gz"
printf "Packing Version $DIST_VERSION\n"

tar -zcvh --xform "s,^,package/," -f $DIST_PATH clientdist/ dist/ package.json
