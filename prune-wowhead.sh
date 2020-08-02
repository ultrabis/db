#!/usr/bin/env bash

# Remove any items from wowhead/items that aren't present in the itemList

itemList="./wowhead/itemList.json"

find ./wowhead/items -type f -name '*.xml.gz' -print0 | while IFS= read -d '' -r file; do
  baseFile="$(basename $file)"
  itemId="$(echo $baseFile | cut -d\- -f 1)" 

  if ! grep -q "{\"id\":$itemId," $itemList; then
    echo "$itemId: doesn't exist in itemList, removing..."
    rm -fv ./wowhead/items/${itemId}-*
  fi

  #echo "searchStr: $searchStr"

  #grep "{\"id\":$itemId," $file

  #fi
done
