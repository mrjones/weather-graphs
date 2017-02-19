usage="$0 [tag]"
project="mrjones/nwschart"
imageName="gcr.io/mrjones-gke/nwschart"

if [ -z $1 ]
then
    echo "Please supply a tag for this image"
    echo "Run 'gcloud docker images' to see existing images / tags"
    echo $usage
    exit 1
fi
tag=$1

push="false"
if [[ $2 == "push" ]]
then
    push="true"
fi

echo "=== Compiling server binary"
cargo build --color=never --release

echo "=== Compiling JavaScript"
webpack

echo "=== Creating image"
docker build -t $project:$tag .
docker tag $project:$tag ${imageName}:${tag}

if [[ $push == "true" ]]
then
    echo "=== Pushing to docker hub"
    gcloud docker push ${imageName}:${tag}

else
    echo "=== Skipping push to docker hub"
fi
