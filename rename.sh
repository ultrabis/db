#!/usr/bin/env bash

find ./wowhead/items -type f -name '*.xml.gz' -print0 | while IFS= read -d '' -r file; do
  baseFile="$(basename $file)"
  xmlString="$(zcat $file)"
  itemIdPos="$(echo $xmlString | grep -b -o "<item id=" | cut -d\: -f 1)"
  itemIdPos=$(( $itemIdPos + 1 ))
  x="$(echo $xmlString | cut -b ${itemIdPos}-)"
  itemId="$(echo $x | cut -d= -f 2 | cut -d\" -f 2)"

  xmlSrcFile="$file"
  xmlDestFile="./wowhead/items/$itemId-$baseFile"
  htmlSrcFile=$(echo $xmlSrcFile | sed 's/.xml.gz/.html.gz/g')
  htmlDestFile=$(echo $xmlDestFile | sed 's/.xml.gz/.html.gz/g')

  mv -fv "$xmlSrcFile" "$xmlDestFile"
  mv -fv "$htmlSrcFile" "$htmlDestFile"
  #echo "itemId: $itemId"
  #echo "xmlSrcFile: $xmlSrcFile"
  #echo "xmlDestFile: $xmlDestFile"
  #echo "htmlSrcFile: $htmlSrcFile"
  #echo "htmlDestFile: $htmlDestFile"

done
