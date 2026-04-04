const fs = require('fs')
const path = require('path')

const regular = fs.readFileSync(path.join(__dirname, '../public/fonts/NotoSans-Regular.ttf'))
const bold = fs.readFileSync(path.join(__dirname, '../public/fonts/NotoSans-Bold.ttf'))

const output = `// Auto-generated font file
export const NotoSansRegular = "${regular.toString('base64')}"
export const NotoSansBold = "${bold.toString('base64')}"
`

fs.writeFileSync(path.join(__dirname, '../src/lib/fonts.js'), output)
console.log('Done! fonts.js created.')