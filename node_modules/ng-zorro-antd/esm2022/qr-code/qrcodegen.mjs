/**
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/NG-ZORRO/ng-zorro-antd/blob/master/LICENSE
 */
/**
 * QR Code generator library (TypeScript)
 *
 * Copyright (c) Project Nayuki.
 * https://www.nayuki.io/page/qr-code-generator-library
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
'use strict';
var qrcodegen;
(function (qrcodegen) {
    /*---- QR Code symbol class ----*/
    /*
     * A QR Code symbol, which is a type of two-dimension barcode.
     * Invented by Denso Wave and described in the ISO/IEC 18004 standard.
     * Instances of this class represent an immutable square grid of dark and light cells.
     * The class provides static factory functions to create a QR Code from text or binary data.
     * The class covers the QR Code Model 2 specification, supporting all versions (sizes)
     * from 1 to 40, all 4 error correction levels, and 4 character encoding modes.
     *
     * Ways to create a QR Code object:
     * - High level: Take the payload data and call QrCode.encodeText() or QrCode.encodeBinary().
     * - Mid level: Custom-make the list of segments and call QrCode.encodeSegments().
     * - Low level: Custom-make the array of data codeword bytes (including
     *   segment headers and final padding, excluding error correction codewords),
     *   supply the appropriate version number, and call the QrCode() constructor.
     * (Note that all ways require supplying the desired error correction level.)
     */
    class QrCode {
        /*-- Static factory functions (high level) --*/
        // Returns a QR Code representing the given Unicode text string at the given error correction level.
        // As a conservative upper bound, this function is guaranteed to succeed for strings that have 738 or fewer
        // Unicode code points (not UTF-16 code units) if the low error correction level is used. The smallest possible
        // QR Code version is automatically chosen for the output. The ECC level of the result may be higher than the
        // ecl argument if it can be done without increasing the version.
        static encodeText(text, ecl) {
            const segs = qrcodegen.QrSegment.makeSegments(text);
            return QrCode.encodeSegments(segs, ecl);
        }
        // Returns a QR Code representing the given binary data at the given error correction level.
        // This function always encodes using the binary segment mode, not any text mode. The maximum number of
        // bytes allowed is 2953. The smallest possible QR Code version is automatically chosen for the output.
        // The ECC level of the result may be higher than the ecl argument if it can be done without increasing the version.
        static encodeBinary(data, ecl) {
            const seg = qrcodegen.QrSegment.makeBytes(data);
            return QrCode.encodeSegments([seg], ecl);
        }
        /*-- Static factory functions (mid level) --*/
        // Returns a QR Code representing the given segments with the given encoding parameters.
        // The smallest possible QR Code version within the given range is automatically
        // chosen for the output. Iff boostEcl is true, then the ECC level of the result
        // may be higher than the ecl argument if it can be done without increasing the
        // version. The mask number is either between 0 to 7 (inclusive) to force that
        // mask, or -1 to automatically choose an appropriate mask (which may be slow).
        // This function allows the user to create a custom sequence of segments that switches
        // between modes (such as alphanumeric and byte) to encode text in less space.
        // This is a mid-level API; the high-level API is encodeText() and encodeBinary().
        static encodeSegments(segs, ecl, minVersion = 1, maxVersion = 40, mask = -1, boostEcl = true) {
            if (!(QrCode.MIN_VERSION <= minVersion && minVersion <= maxVersion && maxVersion <= QrCode.MAX_VERSION) ||
                mask < -1 ||
                mask > 7)
                throw new RangeError('Invalid value');
            // Find the minimal version number to use
            let version;
            let dataUsedBits;
            for (version = minVersion;; version++) {
                const dataCapacityBits = QrCode.getNumDataCodewords(version, ecl) * 8; // Number of data bits available
                const usedBits = QrSegment.getTotalBits(segs, version);
                if (usedBits <= dataCapacityBits) {
                    dataUsedBits = usedBits;
                    break; // This version number is found to be suitable
                }
                if (version >= maxVersion)
                    // All versions in the range could not fit the given data
                    throw new RangeError('Data too long');
            }
            // Increase the error correction level while the data still fits in the current version number
            for (const newEcl of [QrCode.Ecc.MEDIUM, QrCode.Ecc.QUARTILE, QrCode.Ecc.HIGH]) {
                // From low to high
                if (boostEcl && dataUsedBits <= QrCode.getNumDataCodewords(version, newEcl) * 8)
                    ecl = newEcl;
            }
            // Concatenate all segments to create the data bit string
            let bb = [];
            for (const seg of segs) {
                appendBits(seg.mode.modeBits, 4, bb);
                appendBits(seg.numChars, seg.mode.numCharCountBits(version), bb);
                for (const b of seg.getData())
                    bb.push(b);
            }
            assert(bb.length == dataUsedBits);
            // Add terminator and pad up to a byte if applicable
            const dataCapacityBits = QrCode.getNumDataCodewords(version, ecl) * 8;
            assert(bb.length <= dataCapacityBits);
            appendBits(0, Math.min(4, dataCapacityBits - bb.length), bb);
            appendBits(0, (8 - (bb.length % 8)) % 8, bb);
            assert(bb.length % 8 == 0);
            // Pad with alternating bytes until data capacity is reached
            for (let padByte = 0xec; bb.length < dataCapacityBits; padByte ^= 0xec ^ 0x11)
                appendBits(padByte, 8, bb);
            // Pack bits into bytes in big endian
            let dataCodewords = [];
            while (dataCodewords.length * 8 < bb.length)
                dataCodewords.push(0);
            bb.forEach((b, i) => (dataCodewords[i >>> 3] |= b << (7 - (i & 7))));
            // Create the QR Code object
            return new QrCode(version, ecl, dataCodewords, mask);
        }
        /*-- Constructor (low level) and fields --*/
        // Creates a new QR Code with the given version number,
        // error correction level, data codeword bytes, and mask number.
        // This is a low-level API that most users should not use directly.
        // A mid-level API is the encodeSegments() function.
        constructor(
        // The version number of this QR Code, which is between 1 and 40 (inclusive).
        // This determines the size of this barcode.
        version, 
        // The error correction level used in this QR Code.
        errorCorrectionLevel, dataCodewords, msk) {
            this.version = version;
            this.errorCorrectionLevel = errorCorrectionLevel;
            // The modules of this QR Code (false = light, true = dark).
            // Immutable after constructor finishes. Accessed through getModule().
            this.modules = [];
            // Indicates function modules that are not subjected to masking. Discarded when constructor finishes.
            this.isFunction = [];
            // Check scalar arguments
            if (version < QrCode.MIN_VERSION || version > QrCode.MAX_VERSION)
                throw new RangeError('Version value out of range');
            if (msk < -1 || msk > 7)
                throw new RangeError('Mask value out of range');
            this.size = version * 4 + 17;
            // Initialize both grids to be size*size arrays of Boolean false
            let row = [];
            for (let i = 0; i < this.size; i++)
                row.push(false);
            for (let i = 0; i < this.size; i++) {
                this.modules.push(row.slice()); // Initially all light
                this.isFunction.push(row.slice());
            }
            // Compute ECC, draw modules
            this.drawFunctionPatterns();
            const allCodewords = this.addEccAndInterleave(dataCodewords);
            this.drawCodewords(allCodewords);
            // Do masking
            if (msk == -1) {
                // Automatically choose best mask
                let minPenalty = 1000000000;
                for (let i = 0; i < 8; i++) {
                    this.applyMask(i);
                    this.drawFormatBits(i);
                    const penalty = this.getPenaltyScore();
                    if (penalty < minPenalty) {
                        msk = i;
                        minPenalty = penalty;
                    }
                    this.applyMask(i); // Undoes the mask due to XOR
                }
            }
            assert(msk >= 0 && msk <= 7);
            this.mask = msk;
            this.applyMask(msk); // Apply the final choice of mask
            this.drawFormatBits(msk); // Overwrite old format bits
            this.isFunction = [];
        }
        /*-- Accessor methods --*/
        // Returns the color of the module (pixel) at the given coordinates, which is false
        // for light or true for dark. The top left corner has the coordinates (x=0, y=0).
        // If the given coordinates are out of bounds, then false (light) is returned.
        getModule(x, y) {
            return x >= 0 && x < this.size && y >= 0 && y < this.size && this.modules[y][x];
        }
        // Modified to expose modules for easy access
        // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
        getModules() {
            return this.modules;
        }
        /*-- Private helper methods for constructor: Drawing function modules --*/
        // Reads this object's version field, and draws and marks all function modules.
        drawFunctionPatterns() {
            // Draw horizontal and vertical timing patterns
            for (let i = 0; i < this.size; i++) {
                this.setFunctionModule(6, i, i % 2 == 0);
                this.setFunctionModule(i, 6, i % 2 == 0);
            }
            // Draw 3 finder patterns (all corners except bottom right; overwrites some timing modules)
            this.drawFinderPattern(3, 3);
            this.drawFinderPattern(this.size - 4, 3);
            this.drawFinderPattern(3, this.size - 4);
            // Draw numerous alignment patterns
            const alignPatPos = this.getAlignmentPatternPositions();
            const numAlign = alignPatPos.length;
            for (let i = 0; i < numAlign; i++) {
                for (let j = 0; j < numAlign; j++) {
                    // Don't draw on the three finder corners
                    if (!((i == 0 && j == 0) || (i == 0 && j == numAlign - 1) || (i == numAlign - 1 && j == 0)))
                        this.drawAlignmentPattern(alignPatPos[i], alignPatPos[j]);
                }
            }
            // Draw configuration data
            this.drawFormatBits(0); // Dummy mask value; overwritten later in the constructor
            this.drawVersion();
        }
        // Draws two copies of the format bits (with its own error correction code)
        // based on the given mask and this object's error correction level field.
        drawFormatBits(mask) {
            // Calculate error correction code and pack bits
            const data = (this.errorCorrectionLevel.formatBits << 3) | mask; // errCorrLvl is uint2, mask is uint3
            let rem = data;
            for (let i = 0; i < 10; i++)
                rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
            const bits = ((data << 10) | rem) ^ 0x5412; // uint15
            assert(bits >>> 15 == 0);
            // Draw first copy
            for (let i = 0; i <= 5; i++)
                this.setFunctionModule(8, i, getBit(bits, i));
            this.setFunctionModule(8, 7, getBit(bits, 6));
            this.setFunctionModule(8, 8, getBit(bits, 7));
            this.setFunctionModule(7, 8, getBit(bits, 8));
            for (let i = 9; i < 15; i++)
                this.setFunctionModule(14 - i, 8, getBit(bits, i));
            // Draw second copy
            for (let i = 0; i < 8; i++)
                this.setFunctionModule(this.size - 1 - i, 8, getBit(bits, i));
            for (let i = 8; i < 15; i++)
                this.setFunctionModule(8, this.size - 15 + i, getBit(bits, i));
            this.setFunctionModule(8, this.size - 8, true); // Always dark
        }
        // Draws two copies of the version bits (with its own error correction code),
        // based on this object's version field, iff 7 <= version <= 40.
        drawVersion() {
            if (this.version < 7)
                return;
            // Calculate error correction code and pack bits
            let rem = this.version; // version is uint6, in the range [7, 40]
            for (let i = 0; i < 12; i++)
                rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25);
            const bits = (this.version << 12) | rem; // uint18
            assert(bits >>> 18 == 0);
            // Draw two copies
            for (let i = 0; i < 18; i++) {
                const color = getBit(bits, i);
                const a = this.size - 11 + (i % 3);
                const b = Math.floor(i / 3);
                this.setFunctionModule(a, b, color);
                this.setFunctionModule(b, a, color);
            }
        }
        // Draws a 9*9 finder pattern including the border separator,
        // with the center module at (x, y). Modules can be out of bounds.
        drawFinderPattern(x, y) {
            for (let dy = -4; dy <= 4; dy++) {
                for (let dx = -4; dx <= 4; dx++) {
                    const dist = Math.max(Math.abs(dx), Math.abs(dy)); // Chebyshev/infinity norm
                    const xx = x + dx;
                    const yy = y + dy;
                    if (xx >= 0 && xx < this.size && yy >= 0 && yy < this.size)
                        this.setFunctionModule(xx, yy, dist != 2 && dist != 4);
                }
            }
        }
        // Draws a 5*5 alignment pattern, with the center module
        // at (x, y). All modules must be in bounds.
        drawAlignmentPattern(x, y) {
            for (let dy = -2; dy <= 2; dy++) {
                for (let dx = -2; dx <= 2; dx++)
                    this.setFunctionModule(x + dx, y + dy, Math.max(Math.abs(dx), Math.abs(dy)) != 1);
            }
        }
        // Sets the color of a module and marks it as a function module.
        // Only used by the constructor. Coordinates must be in bounds.
        setFunctionModule(x, y, isDark) {
            this.modules[y][x] = isDark;
            this.isFunction[y][x] = true;
        }
        /*-- Private helper methods for constructor: Codewords and masking --*/
        // Returns a new byte string representing the given data with the appropriate error correction
        // codewords appended to it, based on this object's version and error correction level.
        addEccAndInterleave(data) {
            const ver = this.version;
            const ecl = this.errorCorrectionLevel;
            if (data.length != QrCode.getNumDataCodewords(ver, ecl))
                throw new RangeError('Invalid argument');
            // Calculate parameter numbers
            const numBlocks = QrCode.NUM_ERROR_CORRECTION_BLOCKS[ecl.ordinal][ver];
            const blockEccLen = QrCode.ECC_CODEWORDS_PER_BLOCK[ecl.ordinal][ver];
            const rawCodewords = Math.floor(QrCode.getNumRawDataModules(ver) / 8);
            const numShortBlocks = numBlocks - (rawCodewords % numBlocks);
            const shortBlockLen = Math.floor(rawCodewords / numBlocks);
            // Split data into blocks and append ECC to each block
            let blocks = [];
            const rsDiv = QrCode.reedSolomonComputeDivisor(blockEccLen);
            for (let i = 0, k = 0; i < numBlocks; i++) {
                let dat = data.slice(k, k + shortBlockLen - blockEccLen + (i < numShortBlocks ? 0 : 1));
                k += dat.length;
                const ecc = QrCode.reedSolomonComputeRemainder(dat, rsDiv);
                if (i < numShortBlocks)
                    dat.push(0);
                blocks.push(dat.concat(ecc));
            }
            // Interleave (not concatenate) the bytes from every block into a single sequence
            let result = [];
            for (let i = 0; i < blocks[0].length; i++) {
                blocks.forEach((block, j) => {
                    // Skip the padding byte in short blocks
                    if (i != shortBlockLen - blockEccLen || j >= numShortBlocks)
                        result.push(block[i]);
                });
            }
            assert(result.length == rawCodewords);
            return result;
        }
        // Draws the given sequence of 8-bit codewords (data and error correction) onto the entire
        // data area of this QR Code. Function modules need to be marked off before this is called.
        drawCodewords(data) {
            if (data.length != Math.floor(QrCode.getNumRawDataModules(this.version) / 8))
                throw new RangeError('Invalid argument');
            let i = 0; // Bit index into the data
            // Do the funny zigzag scan
            for (let right = this.size - 1; right >= 1; right -= 2) {
                // Index of right column in each column pair
                if (right == 6)
                    right = 5;
                for (let vert = 0; vert < this.size; vert++) {
                    // Vertical counter
                    for (let j = 0; j < 2; j++) {
                        const x = right - j; // Actual x coordinate
                        const upward = ((right + 1) & 2) == 0;
                        const y = upward ? this.size - 1 - vert : vert; // Actual y coordinate
                        if (!this.isFunction[y][x] && i < data.length * 8) {
                            this.modules[y][x] = getBit(data[i >>> 3], 7 - (i & 7));
                            i++;
                        }
                        // If this QR Code has any remainder bits (0 to 7), they were assigned as
                        // 0/false/light by the constructor and are left unchanged by this method
                    }
                }
            }
            assert(i == data.length * 8);
        }
        // XORs the codeword modules in this QR Code with the given mask pattern.
        // The function modules must be marked and the codeword bits must be drawn
        // before masking. Due to the arithmetic of XOR, calling applyMask() with
        // the same mask value a second time will undo the mask. A final well-formed
        // QR Code needs exactly one (not zero, two, etc.) mask applied.
        applyMask(mask) {
            if (mask < 0 || mask > 7)
                throw new RangeError('Mask value out of range');
            for (let y = 0; y < this.size; y++) {
                for (let x = 0; x < this.size; x++) {
                    let invert;
                    switch (mask) {
                        case 0:
                            invert = (x + y) % 2 == 0;
                            break;
                        case 1:
                            invert = y % 2 == 0;
                            break;
                        case 2:
                            invert = x % 3 == 0;
                            break;
                        case 3:
                            invert = (x + y) % 3 == 0;
                            break;
                        case 4:
                            invert = (Math.floor(x / 3) + Math.floor(y / 2)) % 2 == 0;
                            break;
                        case 5:
                            invert = ((x * y) % 2) + ((x * y) % 3) == 0;
                            break;
                        case 6:
                            invert = (((x * y) % 2) + ((x * y) % 3)) % 2 == 0;
                            break;
                        case 7:
                            invert = (((x + y) % 2) + ((x * y) % 3)) % 2 == 0;
                            break;
                        default:
                            throw new Error('Unreachable');
                    }
                    if (!this.isFunction[y][x] && invert)
                        this.modules[y][x] = !this.modules[y][x];
                }
            }
        }
        // Calculates and returns the penalty score based on state of this QR Code's current modules.
        // This is used by the automatic mask choice algorithm to find the mask pattern that yields the lowest score.
        getPenaltyScore() {
            let result = 0;
            // Adjacent modules in row having same color, and finder-like patterns
            for (let y = 0; y < this.size; y++) {
                let runColor = false;
                let runX = 0;
                let runHistory = [0, 0, 0, 0, 0, 0, 0];
                for (let x = 0; x < this.size; x++) {
                    if (this.modules[y][x] == runColor) {
                        runX++;
                        if (runX == 5)
                            result += QrCode.PENALTY_N1;
                        else if (runX > 5)
                            result++;
                    }
                    else {
                        this.finderPenaltyAddHistory(runX, runHistory);
                        if (!runColor)
                            result += this.finderPenaltyCountPatterns(runHistory) * QrCode.PENALTY_N3;
                        runColor = this.modules[y][x];
                        runX = 1;
                    }
                }
                result += this.finderPenaltyTerminateAndCount(runColor, runX, runHistory) * QrCode.PENALTY_N3;
            }
            // Adjacent modules in column having same color, and finder-like patterns
            for (let x = 0; x < this.size; x++) {
                let runColor = false;
                let runY = 0;
                let runHistory = [0, 0, 0, 0, 0, 0, 0];
                for (let y = 0; y < this.size; y++) {
                    if (this.modules[y][x] == runColor) {
                        runY++;
                        if (runY == 5)
                            result += QrCode.PENALTY_N1;
                        else if (runY > 5)
                            result++;
                    }
                    else {
                        this.finderPenaltyAddHistory(runY, runHistory);
                        if (!runColor)
                            result += this.finderPenaltyCountPatterns(runHistory) * QrCode.PENALTY_N3;
                        runColor = this.modules[y][x];
                        runY = 1;
                    }
                }
                result += this.finderPenaltyTerminateAndCount(runColor, runY, runHistory) * QrCode.PENALTY_N3;
            }
            // 2*2 blocks of modules having same color
            for (let y = 0; y < this.size - 1; y++) {
                for (let x = 0; x < this.size - 1; x++) {
                    const color = this.modules[y][x];
                    if (color == this.modules[y][x + 1] && color == this.modules[y + 1][x] && color == this.modules[y + 1][x + 1])
                        result += QrCode.PENALTY_N2;
                }
            }
            // Balance of dark and light modules
            let dark = 0;
            for (const row of this.modules)
                dark = row.reduce((sum, color) => sum + (color ? 1 : 0), dark);
            const total = this.size * this.size; // Note that size is odd, so dark/total != 1/2
            // Compute the smallest integer k >= 0 such that (45-5k)% <= dark/total <= (55+5k)%
            const k = Math.ceil(Math.abs(dark * 20 - total * 10) / total) - 1;
            assert(k >= 0 && k <= 9);
            result += k * QrCode.PENALTY_N4;
            assert(result >= 0 && result <= 2568888); // Non-tight upper bound based on default values of PENALTY_N1, ..., N4
            return result;
        }
        /*-- Private helper functions --*/
        // Returns an ascending list of positions of alignment patterns for this version number.
        // Each position is in the range [0,177), and are used on both the x and y axes.
        // This could be implemented as lookup table of 40 variable-length lists of integers.
        getAlignmentPatternPositions() {
            if (this.version == 1)
                return [];
            else {
                const numAlign = Math.floor(this.version / 7) + 2;
                const step = this.version == 32 ? 26 : Math.ceil((this.version * 4 + 4) / (numAlign * 2 - 2)) * 2;
                let result = [6];
                for (let pos = this.size - 7; result.length < numAlign; pos -= step)
                    result.splice(1, 0, pos);
                return result;
            }
        }
        // Returns the number of data bits that can be stored in a QR Code of the given version number, after
        // all function modules are excluded. This includes remainder bits, so it might not be a multiple of 8.
        // The result is in the range [208, 29648]. This could be implemented as a 40-entry lookup table.
        static getNumRawDataModules(ver) {
            if (ver < QrCode.MIN_VERSION || ver > QrCode.MAX_VERSION)
                throw new RangeError('Version number out of range');
            let result = (16 * ver + 128) * ver + 64;
            if (ver >= 2) {
                const numAlign = Math.floor(ver / 7) + 2;
                result -= (25 * numAlign - 10) * numAlign - 55;
                if (ver >= 7)
                    result -= 36;
            }
            assert(result >= 208 && result <= 29648);
            return result;
        }
        // Returns the number of 8-bit data (i.e. not error correction) codewords contained in any
        // QR Code of the given version number and error correction level, with remainder bits discarded.
        // This stateless pure function could be implemented as a (40*4)-cell lookup table.
        static getNumDataCodewords(ver, ecl) {
            return (Math.floor(QrCode.getNumRawDataModules(ver) / 8) -
                QrCode.ECC_CODEWORDS_PER_BLOCK[ecl.ordinal][ver] * QrCode.NUM_ERROR_CORRECTION_BLOCKS[ecl.ordinal][ver]);
        }
        // Returns a Reed-Solomon ECC generator polynomial for the given degree. This could be
        // implemented as a lookup table over all possible parameter values, instead of as an algorithm.
        static reedSolomonComputeDivisor(degree) {
            if (degree < 1 || degree > 255)
                throw new RangeError('Degree out of range');
            // Polynomial coefficients are stored from highest to lowest power, excluding the leading term which is always 1.
            // For example the polynomial x^3 + 255x^2 + 8x + 93 is stored as the uint8 array [255, 8, 93].
            let result = [];
            for (let i = 0; i < degree - 1; i++)
                result.push(0);
            result.push(1); // Start off with the monomial x^0
            // Compute the product polynomial (x - r^0) * (x - r^1) * (x - r^2) * ... * (x - r^{degree-1}),
            // and drop the highest monomial term which is always 1x^degree.
            // Note that r = 0x02, which is a generator element of this field GF(2^8/0x11D).
            let root = 1;
            for (let i = 0; i < degree; i++) {
                // Multiply the current product by (x - r^i)
                for (let j = 0; j < result.length; j++) {
                    result[j] = QrCode.reedSolomonMultiply(result[j], root);
                    if (j + 1 < result.length)
                        result[j] ^= result[j + 1];
                }
                root = QrCode.reedSolomonMultiply(root, 0x02);
            }
            return result;
        }
        // Returns the Reed-Solomon error correction codeword for the given data and divisor polynomials.
        static reedSolomonComputeRemainder(data, divisor) {
            let result = divisor.map(_ => 0);
            for (const b of data) {
                // Polynomial division
                const factor = b ^ result.shift();
                result.push(0);
                divisor.forEach((coef, i) => (result[i] ^= QrCode.reedSolomonMultiply(coef, factor)));
            }
            return result;
        }
        // Returns the product of the two given field elements modulo GF(2^8/0x11D). The arguments and result
        // are unsigned 8-bit integers. This could be implemented as a lookup table of 256*256 entries of uint8.
        static reedSolomonMultiply(x, y) {
            if (x >>> 8 != 0 || y >>> 8 != 0)
                throw new RangeError('Byte out of range');
            // Russian peasant multiplication
            let z = 0;
            for (let i = 7; i >= 0; i--) {
                z = (z << 1) ^ ((z >>> 7) * 0x11d);
                z ^= ((y >>> i) & 1) * x;
            }
            assert(z >>> 8 == 0);
            return z;
        }
        // Can only be called immediately after a light run is added, and
        // returns either 0, 1, or 2. A helper function for getPenaltyScore().
        finderPenaltyCountPatterns(runHistory) {
            const n = runHistory[1];
            assert(n <= this.size * 3);
            const core = n > 0 && runHistory[2] == n && runHistory[3] == n * 3 && runHistory[4] == n && runHistory[5] == n;
            return ((core && runHistory[0] >= n * 4 && runHistory[6] >= n ? 1 : 0) +
                (core && runHistory[6] >= n * 4 && runHistory[0] >= n ? 1 : 0));
        }
        // Must be called at the end of a line (row or column) of modules. A helper function for getPenaltyScore().
        finderPenaltyTerminateAndCount(currentRunColor, currentRunLength, runHistory) {
            if (currentRunColor) {
                // Terminate dark run
                this.finderPenaltyAddHistory(currentRunLength, runHistory);
                currentRunLength = 0;
            }
            currentRunLength += this.size; // Add light border to final run
            this.finderPenaltyAddHistory(currentRunLength, runHistory);
            return this.finderPenaltyCountPatterns(runHistory);
        }
        // Pushes the given value to the front and drops the last value. A helper function for getPenaltyScore().
        finderPenaltyAddHistory(currentRunLength, runHistory) {
            if (runHistory[0] == 0)
                currentRunLength += this.size; // Add light border to initial run
            runHistory.pop();
            runHistory.unshift(currentRunLength);
        }
        /*-- Constants and tables --*/
        // The minimum version number supported in the QR Code Model 2 standard.
        static { this.MIN_VERSION = 1; }
        // The maximum version number supported in the QR Code Model 2 standard.
        static { this.MAX_VERSION = 40; }
        // For use in getPenaltyScore(), when evaluating which mask is best.
        static { this.PENALTY_N1 = 3; }
        static { this.PENALTY_N2 = 3; }
        static { this.PENALTY_N3 = 40; }
        static { this.PENALTY_N4 = 10; }
        static { this.ECC_CODEWORDS_PER_BLOCK = [
            // Version: (note that index 0 is for padding, and is set to an illegal value)
            //0,  1,  2,  3,  4,  5,  6,  7,  8,  9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40    Error correction level
            [
                -1, 7, 10, 15, 20, 26, 18, 20, 24, 30, 18, 20, 24, 26, 30, 22, 24, 28, 30, 28, 28, 28, 28, 30, 30, 26, 28, 30,
                30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30
            ], // Low
            [
                -1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26, 26, 28, 28, 28, 28, 28, 28,
                28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28
            ], // Medium
            [
                -1, 13, 22, 18, 26, 18, 24, 18, 22, 20, 24, 28, 26, 24, 20, 30, 24, 28, 28, 26, 30, 28, 30, 30, 30, 30, 28, 30,
                30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30
            ], // Quartile
            [
                -1, 17, 28, 22, 16, 22, 28, 26, 26, 24, 28, 24, 28, 22, 24, 24, 30, 28, 28, 26, 28, 30, 24, 30, 30, 30, 30, 30,
                30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30
            ] // High
        ]; }
        static { this.NUM_ERROR_CORRECTION_BLOCKS = [
            // Version: (note that index 0 is for padding, and is set to an illegal value)
            //0, 1, 2, 3, 4, 5, 6, 7, 8, 9,10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40    Error correction level
            [
                -1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 4, 4, 4, 4, 4, 6, 6, 6, 6, 7, 8, 8, 9, 9, 10, 12, 12, 12, 13, 14, 15, 16, 17, 18,
                19, 19, 20, 21, 22, 24, 25
            ], // Low
            [
                -1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16, 17, 17, 18, 20, 21, 23, 25, 26, 28, 29,
                31, 33, 35, 37, 38, 40, 43, 45, 47, 49
            ], // Medium
            [
                -1, 1, 1, 2, 2, 4, 4, 6, 6, 8, 8, 8, 10, 12, 16, 12, 17, 16, 18, 21, 20, 23, 23, 25, 27, 29, 34, 34, 35, 38, 40,
                43, 45, 48, 51, 53, 56, 59, 62, 65, 68
            ], // Quartile
            [
                -1, 1, 1, 2, 4, 4, 4, 5, 6, 8, 8, 11, 11, 16, 16, 18, 16, 19, 21, 25, 25, 25, 34, 30, 32, 35, 37, 40, 42, 45,
                48, 51, 54, 57, 60, 63, 66, 70, 74, 77, 81
            ] // High
        ]; }
    }
    qrcodegen.QrCode = QrCode;
    // Appends the given number of low-order bits of the given value
    // to the given buffer. Requires 0 <= len <= 31 and 0 <= val < 2^len.
    function appendBits(val, len, bb) {
        if (len < 0 || len > 31 || val >>> len != 0)
            throw new RangeError('Value out of range');
        for (let i = len - 1; i >= 0; i-- // Append bit by bit
        )
            bb.push((val >>> i) & 1);
    }
    // Returns true iff the i'th bit of x is set to 1.
    function getBit(x, i) {
        return ((x >>> i) & 1) != 0;
    }
    // Throws an exception if the given condition is false.
    function assert(cond) {
        if (!cond)
            throw new Error('Assertion error');
    }
    /*---- Data segment class ----*/
    /*
     * A segment of character/binary/control data in a QR Code symbol.
     * Instances of this class are immutable.
     * The mid-level way to create a segment is to take the payload data
     * and call a static factory function such as QrSegment.makeNumeric().
     * The low-level way to create a segment is to custom-make the bit buffer
     * and call the QrSegment() constructor with appropriate values.
     * This segment class imposes no length restrictions, but QR Codes have restrictions.
     * Even in the most favorable conditions, a QR Code can only hold 7089 characters of data.
     * Any segment longer than this is meaningless for the purpose of generating QR Codes.
     */
    class QrSegment {
        /*-- Static factory functions (mid level) --*/
        // Returns a segment representing the given binary data encoded in
        // byte mode. All input byte arrays are acceptable. Any text string
        // can be converted to UTF-8 bytes and encoded as a byte mode segment.
        static makeBytes(data) {
            let bb = [];
            for (const b of data)
                appendBits(b, 8, bb);
            return new QrSegment(QrSegment.Mode.BYTE, data.length, bb);
        }
        // Returns a segment representing the given string of decimal digits encoded in numeric mode.
        static makeNumeric(digits) {
            if (!QrSegment.isNumeric(digits))
                throw new RangeError('String contains non-numeric characters');
            let bb = [];
            for (let i = 0; i < digits.length;) {
                // Consume up to 3 digits per iteration
                const n = Math.min(digits.length - i, 3);
                appendBits(parseInt(digits.substring(i, i + n), 10), n * 3 + 1, bb);
                i += n;
            }
            return new QrSegment(QrSegment.Mode.NUMERIC, digits.length, bb);
        }
        // Returns a segment representing the given text string encoded in alphanumeric mode.
        // The characters allowed are: 0 to 9, A to Z (uppercase only), space,
        // dollar, percent, asterisk, plus, hyphen, period, slash, colon.
        static makeAlphanumeric(text) {
            if (!QrSegment.isAlphanumeric(text))
                throw new RangeError('String contains unencodable characters in alphanumeric mode');
            let bb = [];
            let i;
            for (i = 0; i + 2 <= text.length; i += 2) {
                // Process groups of 2
                let temp = QrSegment.ALPHANUMERIC_CHARSET.indexOf(text.charAt(i)) * 45;
                temp += QrSegment.ALPHANUMERIC_CHARSET.indexOf(text.charAt(i + 1));
                appendBits(temp, 11, bb);
            }
            if (i < text.length)
                // 1 character remaining
                appendBits(QrSegment.ALPHANUMERIC_CHARSET.indexOf(text.charAt(i)), 6, bb);
            return new QrSegment(QrSegment.Mode.ALPHANUMERIC, text.length, bb);
        }
        // Returns a new mutable list of zero or more segments to represent the given Unicode text string.
        // The result may use various segment modes and switch modes to optimize the length of the bit stream.
        static makeSegments(text) {
            // Select the most efficient segment encoding automatically
            if (text == '')
                return [];
            else if (QrSegment.isNumeric(text))
                return [QrSegment.makeNumeric(text)];
            else if (QrSegment.isAlphanumeric(text))
                return [QrSegment.makeAlphanumeric(text)];
            else
                return [QrSegment.makeBytes(QrSegment.toUtf8ByteArray(text))];
        }
        // Returns a segment representing an Extended Channel Interpretation
        // (ECI) designator with the given assignment value.
        static makeEci(assignVal) {
            let bb = [];
            if (assignVal < 0)
                throw new RangeError('ECI assignment value out of range');
            else if (assignVal < 1 << 7)
                appendBits(assignVal, 8, bb);
            else if (assignVal < 1 << 14) {
                appendBits(0b10, 2, bb);
                appendBits(assignVal, 14, bb);
            }
            else if (assignVal < 1000000) {
                appendBits(0b110, 3, bb);
                appendBits(assignVal, 21, bb);
            }
            else
                throw new RangeError('ECI assignment value out of range');
            return new QrSegment(QrSegment.Mode.ECI, 0, bb);
        }
        // Tests whether the given string can be encoded as a segment in numeric mode.
        // A string is encodable iff each character is in the range 0 to 9.
        static isNumeric(text) {
            return QrSegment.NUMERIC_REGEX.test(text);
        }
        // Tests whether the given string can be encoded as a segment in alphanumeric mode.
        // A string is encodable iff each character is in the following set: 0 to 9, A to Z
        // (uppercase only), space, dollar, percent, asterisk, plus, hyphen, period, slash, colon.
        static isAlphanumeric(text) {
            return QrSegment.ALPHANUMERIC_REGEX.test(text);
        }
        /*-- Constructor (low level) and fields --*/
        // Creates a new QR Code segment with the given attributes and data.
        // The character count (numChars) must agree with the mode and the bit buffer length,
        // but the constraint isn't checked. The given bit buffer is cloned and stored.
        constructor(
        // The mode indicator of this segment.
        mode, 
        // The length of this segment's unencoded data. Measured in characters for
        // numeric/alphanumeric/kanji mode, bytes for byte mode, and 0 for ECI mode.
        // Always zero or positive. Not the same as the data's bit length.
        numChars, 
        // The data bits of this segment. Accessed through getData().
        bitData) {
            this.mode = mode;
            this.numChars = numChars;
            this.bitData = bitData;
            if (numChars < 0)
                throw new RangeError('Invalid argument');
            this.bitData = bitData.slice(); // Make defensive copy
        }
        /*-- Methods --*/
        // Returns a new copy of the data bits of this segment.
        getData() {
            return this.bitData.slice(); // Make defensive copy
        }
        // (Package-private) Calculates and returns the number of bits needed to encode the given segments at
        // the given version. The result is infinity if a segment has too many characters to fit its length field.
        static getTotalBits(segs, version) {
            let result = 0;
            for (const seg of segs) {
                const ccbits = seg.mode.numCharCountBits(version);
                if (seg.numChars >= 1 << ccbits)
                    return Infinity; // The segment's length doesn't fit the field's bit width
                result += 4 + ccbits + seg.bitData.length;
            }
            return result;
        }
        // Returns a new array of bytes representing the given string encoded in UTF-8.
        static toUtf8ByteArray(str) {
            str = encodeURI(str);
            let result = [];
            for (let i = 0; i < str.length; i++) {
                if (str.charAt(i) != '%')
                    result.push(str.charCodeAt(i));
                else {
                    result.push(parseInt(str.substring(i + 1, i + 3), 16));
                    i += 2;
                }
            }
            return result;
        }
        /*-- Constants --*/
        // Describes precisely all strings that are encodable in numeric mode.
        static { this.NUMERIC_REGEX = /^[0-9]*$/; }
        // Describes precisely all strings that are encodable in alphanumeric mode.
        static { this.ALPHANUMERIC_REGEX = /^[A-Z0-9 $%*+.\/:-]*$/; }
        // The set of all legal characters in alphanumeric mode,
        // where each character value maps to the index in the string.
        static { this.ALPHANUMERIC_CHARSET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:'; }
    }
    qrcodegen.QrSegment = QrSegment;
})(qrcodegen || (qrcodegen = {}));
/*---- Public helper enumeration ----*/
(function (qrcodegen) {
    var QrCode;
    (function (QrCode) {
        /*
         * The error correction level in a QR Code symbol. Immutable.
         */
        class Ecc {
            /*-- Constants --*/
            static { this.LOW = new Ecc(0, 1); } // The QR Code can tolerate about  7% erroneous codewords
            static { this.MEDIUM = new Ecc(1, 0); } // The QR Code can tolerate about 15% erroneous codewords
            static { this.QUARTILE = new Ecc(2, 3); } // The QR Code can tolerate about 25% erroneous codewords
            static { this.HIGH = new Ecc(3, 2); } // The QR Code can tolerate about 30% erroneous codewords
            /*-- Constructor and fields --*/
            constructor(
            // In the range 0 to 3 (unsigned 2-bit integer).
            ordinal, 
            // (Package-private) In the range 0 to 3 (unsigned 2-bit integer).
            formatBits) {
                this.ordinal = ordinal;
                this.formatBits = formatBits;
            }
        }
        QrCode.Ecc = Ecc;
    })(QrCode = qrcodegen.QrCode || (qrcodegen.QrCode = {}));
})(qrcodegen || (qrcodegen = {}));
/*---- Public helper enumeration ----*/
(function (qrcodegen) {
    var QrSegment;
    (function (QrSegment) {
        /*
         * Describes how a segment's data bits are interpreted. Immutable.
         */
        class Mode {
            /*-- Constants --*/
            static { this.NUMERIC = new Mode(0x1, [10, 12, 14]); }
            static { this.ALPHANUMERIC = new Mode(0x2, [9, 11, 13]); }
            static { this.BYTE = new Mode(0x4, [8, 16, 16]); }
            static { this.KANJI = new Mode(0x8, [8, 10, 12]); }
            static { this.ECI = new Mode(0x7, [0, 0, 0]); }
            /*-- Constructor and fields --*/
            constructor(
            // The mode indicator bits, which is a uint4 value (range 0 to 15).
            modeBits, 
            // Number of character count bits for three different version ranges.
            numBitsCharCount) {
                this.modeBits = modeBits;
                this.numBitsCharCount = numBitsCharCount;
            }
            /*-- Method --*/
            // (Package-private) Returns the bit width of the character count field for a segment in
            // this mode in a QR Code at the given version number. The result is in the range [0, 16].
            numCharCountBits(ver) {
                return this.numBitsCharCount[Math.floor((ver + 7) / 17)];
            }
        }
        QrSegment.Mode = Mode;
    })(QrSegment = qrcodegen.QrSegment || (qrcodegen.QrSegment = {}));
})(qrcodegen || (qrcodegen = {}));
// Modification to export for actual use
export default qrcodegen;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicXJjb2RlZ2VuLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vY29tcG9uZW50cy9xci1jb2RlL3FyY29kZWdlbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O0dBR0c7QUFFSDs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7R0F1Qkc7QUFFSCxZQUFZLENBQUM7QUFFYixJQUFVLFNBQVMsQ0EwMUJsQjtBQTExQkQsV0FBVSxTQUFTO0lBS2pCLGtDQUFrQztJQUVsQzs7Ozs7Ozs7Ozs7Ozs7O09BZUc7SUFDSCxNQUFhLE1BQU07UUFDakIsK0NBQStDO1FBRS9DLG9HQUFvRztRQUNwRywyR0FBMkc7UUFDM0csK0dBQStHO1FBQy9HLDZHQUE2RztRQUM3RyxpRUFBaUU7UUFDMUQsTUFBTSxDQUFDLFVBQVUsQ0FBQyxJQUFZLEVBQUUsR0FBZTtZQUNwRCxNQUFNLElBQUksR0FBZ0IsU0FBUyxDQUFDLFNBQVMsQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDakUsT0FBTyxNQUFNLENBQUMsY0FBYyxDQUFDLElBQUksRUFBRSxHQUFHLENBQUMsQ0FBQztRQUMxQyxDQUFDO1FBRUQsNEZBQTRGO1FBQzVGLHVHQUF1RztRQUN2Ryx1R0FBdUc7UUFDdkcsb0hBQW9IO1FBQzdHLE1BQU0sQ0FBQyxZQUFZLENBQUMsSUFBc0IsRUFBRSxHQUFlO1lBQ2hFLE1BQU0sR0FBRyxHQUFjLFNBQVMsQ0FBQyxTQUFTLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQzNELE9BQU8sTUFBTSxDQUFDLGNBQWMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBQzNDLENBQUM7UUFFRCw4Q0FBOEM7UUFFOUMsd0ZBQXdGO1FBQ3hGLGdGQUFnRjtRQUNoRixnRkFBZ0Y7UUFDaEYsK0VBQStFO1FBQy9FLDhFQUE4RTtRQUM5RSwrRUFBK0U7UUFDL0Usc0ZBQXNGO1FBQ3RGLDhFQUE4RTtRQUM5RSxrRkFBa0Y7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QXVCLEdBQVk7WUFDekQsOEVBQThFO1lBQzlFLDZMQUE2TDtZQUM3TDtnQkFDRSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUU7Z0JBQzdHLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUU7YUFDbkQsRUFBRSxNQUFNO1lBQ1Q7Z0JBQ0UsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFO2dCQUM5RyxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFO2FB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QUFFLEVBQUUsRUFBRSxFQUFFO2FBQ3ZDLEVBQUUsU0FBUztZQUNaO2dCQUNFLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRTtnQkFDL0csRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRTthQUN2QyxFQUFFLFdBQVc7WUFDZDtnQkFDRSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRTtnQkFDNUcsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUU7YUFD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QUFJLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDO3FCQUMxQyxTQUFJLEdBQUcsSUFBSSxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDO3FCQUNsQyxVQUFLLEdBQUcsSUFBSSxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDO3FCQUNuQyxRQUFHLEdBQUcsSUFBSSxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBRXRELGdDQUFnQztZQUVoQztZQUNFLG1FQUFtRTtZQUNuRCxRQUFhO1lBQzdCLHFFQUFxRTtZQUNwRCxnQkFBaUM7Z0JBRmxDLGFBQVEsR0FBUixRQUFRLENBQUs7Z0JBRVoscUJBQWdCLEdBQWhCLGdCQUFnQixDQUFpQjtZQUNqRCxDQUFDO1lBRUosZ0JBQWdCO1lBRWhCLHdGQUF3RjtZQUN4RiwwRkFBMEY7WUFDbkYsZ0JBQWdCLENBQUMsR0FBUTtnQkFDOUIsT0FBTyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQzNELENBQUM7O1FBeEJVLGNBQUksT0F5QmhCLENBQUE7SUFDSCxDQUFDLEVBaENtQixTQUFTLEdBQVQsbUJBQVMsS0FBVCxtQkFBUyxRQWdDNUI7QUFBRCxDQUFDLEVBaENTLFNBQVMsS0FBVCxTQUFTLFFBZ0NsQjtBQUVELHdDQUF3QztBQUN4QyxlQUFlLFNBQVMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9naXRodWIuY29tL05HLVpPUlJPL25nLXpvcnJvLWFudGQvYmxvYi9tYXN0ZXIvTElDRU5TRVxuICovXG5cbi8qKlxuICogUVIgQ29kZSBnZW5lcmF0b3IgbGlicmFyeSAoVHlwZVNjcmlwdClcbiAqXG4gKiBDb3B5cmlnaHQgKGMpIFByb2plY3QgTmF5dWtpLlxuICogaHR0cHM6Ly93d3cubmF5dWtpLmlvL3BhZ2UvcXItY29kZS1nZW5lcmF0b3ItbGlicmFyeVxuICpcbiAqIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhIGNvcHlcbiAqIG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlIFwiU29mdHdhcmVcIiksIHRvIGRlYWxcbiAqIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmcgd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHNcbiAqIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCwgZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGxcbiAqIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXQgcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpc1xuICogZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZSBmb2xsb3dpbmcgY29uZGl0aW9uczpcbiAqXG4gKiBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZCBpbiBhbGxcbiAqIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4gKlxuICogVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTUyBPUlxuICogSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRiBNRVJDSEFOVEFCSUxJVFksXG4gKiBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTiBOTyBFVkVOVCBTSEFMTCBUSEVcbiAqIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sIERBTUFHRVMgT1IgT1RIRVJcbiAqIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1IgT1RIRVJXSVNFLCBBUklTSU5HIEZST00sXG4gKiBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEUgVVNFIE9SIE9USEVSIERFQUxJTkdTIElOIFRIRVxuICogU09GVFdBUkUuXG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG5uYW1lc3BhY2UgcXJjb2RlZ2VuIHtcbiAgdHlwZSBiaXQgPSBudW1iZXI7XG4gIHR5cGUgYnl0ZSA9IG51bWJlcjtcbiAgdHlwZSBpbnQgPSBudW1iZXI7XG5cbiAgLyotLS0tIFFSIENvZGUgc3ltYm9sIGNsYXNzIC0tLS0qL1xuXG4gIC8qXG4gICAqIEEgUVIgQ29kZSBzeW1ib2wsIHdoaWNoIGlzIGEgdHlwZSBvZiB0d28tZGltZW5zaW9uIGJhcmNvZGUuXG4gICAqIEludmVudGVkIGJ5IERlbnNvIFdhdmUgYW5kIGRlc2NyaWJlZCBpbiB0aGUgSVNPL0lFQyAxODAwNCBzdGFuZGFyZC5cbiAgICogSW5zdGFuY2VzIG9mIHRoaXMgY2xhc3MgcmVwcmVzZW50IGFuIGltbXV0YWJsZSBzcXVhcmUgZ3JpZCBvZiBkYXJrIGFuZCBsaWdodCBjZWxscy5cbiAgICogVGhlIGNsYXNzIHByb3ZpZGVzIHN0YXRpYyBmYWN0b3J5IGZ1bmN0aW9ucyB0byBjcmVhdGUgYSBRUiBDb2RlIGZyb20gdGV4dCBvciBiaW5hcnkgZGF0YS5cbiAgICogVGhlIGNsYXNzIGNvdmVycyB0aGUgUVIgQ29kZSBNb2RlbCAyIHNwZWNpZmljYXRpb24sIHN1cHBvcnRpbmcgYWxsIHZlcnNpb25zIChzaXplcylcbiAgICogZnJvbSAxIHRvIDQwLCBhbGwgNCBlcnJvciBjb3JyZWN0aW9uIGxldmVscywgYW5kIDQgY2hhcmFjdGVyIGVuY29kaW5nIG1vZGVzLlxuICAgKlxuICAgKiBXYXlzIHRvIGNyZWF0ZSBhIFFSIENvZGUgb2JqZWN0OlxuICAgKiAtIEhpZ2ggbGV2ZWw6IFRha2UgdGhlIHBheWxvYWQgZGF0YSBhbmQgY2FsbCBRckNvZGUuZW5jb2RlVGV4dCgpIG9yIFFyQ29kZS5lbmNvZGVCaW5hcnkoKS5cbiAgICogLSBNaWQgbGV2ZWw6IEN1c3RvbS1tYWtlIHRoZSBsaXN0IG9mIHNlZ21lbnRzIGFuZCBjYWxsIFFyQ29kZS5lbmNvZGVTZWdtZW50cygpLlxuICAgKiAtIExvdyBsZXZlbDogQ3VzdG9tLW1ha2UgdGhlIGFycmF5IG9mIGRhdGEgY29kZXdvcmQgYnl0ZXMgKGluY2x1ZGluZ1xuICAgKiAgIHNlZ21lbnQgaGVhZGVycyBhbmQgZmluYWwgcGFkZGluZywgZXhjbHVkaW5nIGVycm9yIGNvcnJlY3Rpb24gY29kZXdvcmRzKSxcbiAgICogICBzdXBwbHkgdGhlIGFwcHJvcHJpYXRlIHZlcnNpb24gbnVtYmVyLCBhbmQgY2FsbCB0aGUgUXJDb2RlKCkgY29uc3RydWN0b3IuXG4gICAqIChOb3RlIHRoYXQgYWxsIHdheXMgcmVxdWlyZSBzdXBwbHlpbmcgdGhlIGRlc2lyZWQgZXJyb3IgY29ycmVjdGlvbiBsZXZlbC4pXG4gICAqL1xuICBleHBvcnQgY2xhc3MgUXJDb2RlIHtcbiAgICAvKi0tIFN0YXRpYyBmYWN0b3J5IGZ1bmN0aW9ucyAoaGlnaCBsZXZlbCkgLS0qL1xuXG4gICAgLy8gUmV0dXJucyBhIFFSIENvZGUgcmVwcmVzZW50aW5nIHRoZSBnaXZlbiBVbmljb2RlIHRleHQgc3RyaW5nIGF0IHRoZSBnaXZlbiBlcnJvciBjb3JyZWN0aW9uIGxldmVsLlxuICAgIC8vIEFzIGEgY29uc2VydmF0aXZlIHVwcGVyIGJvdW5kLCB0aGlzIGZ1bmN0aW9uIGlzIGd1YXJhbnRlZWQgdG8gc3VjY2VlZCBmb3Igc3RyaW5ncyB0aGF0IGhhdmUgNzM4IG9yIGZld2VyXG4gICAgLy8gVW5pY29kZSBjb2RlIHBvaW50cyAobm90IFVURi0xNiBjb2RlIHVuaXRzKSBpZiB0aGUgbG93IGVycm9yIGNvcnJlY3Rpb24gbGV2ZWwgaXMgdXNlZC4gVGhlIHNtYWxsZXN0IHBvc3NpYmxlXG4gICAgLy8gUVIgQ29kZSB2ZXJzaW9uIGlzIGF1dG9tYXRpY2FsbHkgY2hvc2VuIGZvciB0aGUgb3V0cHV0LiBUaGUgRUNDIGxldmVsIG9mIHRoZSByZXN1bHQgbWF5IGJlIGhpZ2hlciB0aGFuIHRoZVxuICAgIC8vIGVjbCBhcmd1bWVudCBpZiBpdCBjYW4gYmUgZG9uZSB3aXRob3V0IGluY3JlYXNpbmcgdGhlIHZlcnNpb24uXG4gICAgcHVibGljIHN0YXRpYyBlbmNvZGVUZXh0KHRleHQ6IHN0cmluZywgZWNsOiBRckNvZGUuRWNjKTogUXJDb2RlIHtcbiAgICAgIGNvbnN0IHNlZ3M6IFFyU2VnbWVudFtdID0gcXJjb2RlZ2VuLlFyU2VnbWVudC5tYWtlU2VnbWVudHModGV4dCk7XG4gICAgICByZXR1cm4gUXJDb2RlLmVuY29kZVNlZ21lbnRzKHNlZ3MsIGVjbCk7XG4gICAgfVxuXG4gICAgLy8gUmV0dXJucyBhIFFSIENvZGUgcmVwcmVzZW50aW5nIHRoZSBnaXZlbiBiaW5hcnkgZGF0YSBhdCB0aGUgZ2l2ZW4gZXJyb3IgY29ycmVjdGlvbiBsZXZlbC5cbiAgICAvLyBUaGlzIGZ1bmN0aW9uIGFsd2F5cyBlbmNvZGVzIHVzaW5nIHRoZSBiaW5hcnkgc2VnbWVudCBtb2RlLCBub3QgYW55IHRleHQgbW9kZS4gVGhlIG1heGltdW0gbnVtYmVyIG9mXG4gICAgLy8gYnl0ZXMgYWxsb3dlZCBpcyAyOTUzLiBUaGUgc21hbGxlc3QgcG9zc2libGUgUVIgQ29kZSB2ZXJzaW9uIGlzIGF1dG9tYXRpY2FsbHkgY2hvc2VuIGZvciB0aGUgb3V0cHV0LlxuICAgIC8vIFRoZSBFQ0MgbGV2ZWwgb2YgdGhlIHJlc3VsdCBtYXkgYmUgaGlnaGVyIHRoYW4gdGhlIGVjbCBhcmd1bWVudCBpZiBpdCBjYW4gYmUgZG9uZSB3aXRob3V0IGluY3JlYXNpbmcgdGhlIHZlcnNpb24uXG4gICAgcHVibGljIHN0YXRpYyBlbmNvZGVCaW5hcnkoZGF0YTogUmVhZG9ubHk8Ynl0ZVtdPiwgZWNsOiBRckNvZGUuRWNjKTogUXJDb2RlIHtcbiAgICAgIGNvbnN0IHNlZzogUXJTZWdtZW50ID0gcXJjb2RlZ2VuLlFyU2VnbWVudC5tYWtlQnl0ZXMoZGF0YSk7XG4gICAgICByZXR1cm4gUXJDb2RlLmVuY29kZVNlZ21lbnRzKFtzZWddLCBlY2wpO1xuICAgIH1cblxuICAgIC8qLS0gU3RhdGljIGZhY3RvcnkgZnVuY3Rpb25zIChtaWQgbGV2ZWwpIC0tKi9cblxuICAgIC8vIFJldHVybnMgYSBRUiBDb2RlIHJlcHJlc2VudGluZyB0aGUgZ2l2ZW4gc2VnbWVudHMgd2l0aCB0aGUgZ2l2ZW4gZW5jb2RpbmcgcGFyYW1ldGVycy5cbiAgICAvLyBUaGUgc21hbGxlc3QgcG9zc2libGUgUVIgQ29kZSB2ZXJzaW9uIHdpdGhpbiB0aGUgZ2l2ZW4gcmFuZ2UgaXMgYXV0b21hdGljYWxseVxuICAgIC8vIGNob3NlbiBmb3IgdGhlIG91dHB1dC4gSWZmIGJvb3N0RWNsIGlzIHRydWUsIHRoZW4gdGhlIEVDQyBsZXZlbCBvZiB0aGUgcmVzdWx0XG4gICAgLy8gbWF5IGJlIGhpZ2hlciB0aGFuIHRoZSBlY2wgYXJndW1lbnQgaWYgaXQgY2FuIGJlIGRvbmUgd2l0aG91dCBpbmNyZWFzaW5nIHRoZVxuICAgIC8vIHZlcnNpb24uIFRoZSBtYXNrIG51bWJlciBpcyBlaXRoZXIgYmV0d2VlbiAwIHRvIDcgKGluY2x1c2l2ZSkgdG8gZm9yY2UgdGhhdFxuICAgIC8vIG1hc2ssIG9yIC0xIHRvIGF1dG9tYXRpY2FsbHkgY2hvb3NlIGFuIGFwcHJvcHJpYXRlIG1hc2sgKHdoaWNoIG1heSBiZSBzbG93KS5cbiAgICAvLyBUaGlzIGZ1bmN0aW9uIGFsbG93cyB0aGUgdXNlciB0byBjcmVhdGUgYSBjdXN0b20gc2VxdWVuY2Ugb2Ygc2VnbWVudHMgdGhhdCBzd2l0Y2hlc1xuICAgIC8vIGJldHdlZW4gbW9kZXMgKHN1Y2ggYXMgYWxwaGFudW1lcmljIGFuZCBieXRlKSB0byBlbmNvZGUgdGV4dCBpbiBsZXNzIHNwYWNlLlxuICAgIC8vIFRoaXMgaXMgYSBtaWQtbGV2ZWwgQVBJOyB0aGUgaGlnaC1sZXZlbCBBUEkgaXMgZW5jb2RlVGV4dCgpIGFuZCBlbmNvZGVCaW5hcnkoKS5cbiAgICBwdWJsaWMgc3RhdGljIGVuY29kZVNlZ21lbnRzKFxuICAgICAgc2VnczogUmVhZG9ubHk8UXJTZWdtZW50W10+LFxuICAgICAgZWNsOiBRckNvZGUuRWNjLFxuICAgICAgbWluVmVyc2lvbjogaW50ID0gMSxcbiAgICAgIG1heFZlcnNpb246IGludCA9IDQwLFxuICAgICAgbWFzazogaW50ID0gLTEsXG4gICAgICBib29zdEVjbDogYm9vbGVhbiA9IHRydWVcbiAgICApOiBRckNvZGUge1xuICAgICAgaWYgKFxuICAgICAgICAhKFFyQ29kZS5NSU5fVkVSU0lPTiA8PSBtaW5WZXJzaW9uICYmIG1pblZlcnNpb24gPD0gbWF4VmVyc2lvbiAmJiBtYXhWZXJzaW9uIDw9IFFyQ29kZS5NQVhfVkVSU0lPTikgfHxcbiAgICAgICAgbWFzayA8IC0xIHx8XG4gICAgICAgIG1hc2sgPiA3XG4gICAgICApXG4gICAgICAgIHRocm93IG5ldyBSYW5nZUVycm9yKCdJbnZhbGlkIHZhbHVlJyk7XG5cbiAgICAgIC8vIEZpbmQgdGhlIG1pbmltYWwgdmVyc2lvbiBudW1iZXIgdG8gdXNlXG4gICAgICBsZXQgdmVyc2lvbjogaW50O1xuICAgICAgbGV0IGRhdGFVc2VkQml0czogaW50O1xuICAgICAgZm9yICh2ZXJzaW9uID0gbWluVmVyc2lvbjsgOyB2ZXJzaW9uKyspIHtcbiAgICAgICAgY29uc3QgZGF0YUNhcGFjaXR5Qml0czogaW50ID0gUXJDb2RlLmdldE51bURhdGFDb2Rld29yZHModmVyc2lvbiwgZWNsKSAqIDg7IC8vIE51bWJlciBvZiBkYXRhIGJpdHMgYXZhaWxhYmxlXG4gICAgICAgIGNvbnN0IHVzZWRCaXRzOiBudW1iZXIgPSBRclNlZ21lbnQuZ2V0VG90YWxCaXRzKHNlZ3MsIHZlcnNpb24pO1xuICAgICAgICBpZiAodXNlZEJpdHMgPD0gZGF0YUNhcGFjaXR5Qml0cykge1xuICAgICAgICAgIGRhdGFVc2VkQml0cyA9IHVzZWRCaXRzO1xuICAgICAgICAgIGJyZWFrOyAvLyBUaGlzIHZlcnNpb24gbnVtYmVyIGlzIGZvdW5kIHRvIGJlIHN1aXRhYmxlXG4gICAgICAgIH1cbiAgICAgICAgaWYgKHZlcnNpb24gPj0gbWF4VmVyc2lvbilcbiAgICAgICAgICAvLyBBbGwgdmVyc2lvbnMgaW4gdGhlIHJhbmdlIGNvdWxkIG5vdCBmaXQgdGhlIGdpdmVuIGRhdGFcbiAgICAgICAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcignRGF0YSB0b28gbG9uZycpO1xuICAgICAgfVxuXG4gICAgICAvLyBJbmNyZWFzZSB0aGUgZXJyb3IgY29ycmVjdGlvbiBsZXZlbCB3aGlsZSB0aGUgZGF0YSBzdGlsbCBmaXRzIGluIHRoZSBjdXJyZW50IHZlcnNpb24gbnVtYmVyXG4gICAgICBmb3IgKGNvbnN0IG5ld0VjbCBvZiBbUXJDb2RlLkVjYy5NRURJVU0sIFFyQ29kZS5FY2MuUVVBUlRJTEUsIFFyQ29kZS5FY2MuSElHSF0pIHtcbiAgICAgICAgLy8gRnJvbSBsb3cgdG8gaGlnaFxuICAgICAgICBpZiAoYm9vc3RFY2wgJiYgZGF0YVVzZWRCaXRzIDw9IFFyQ29kZS5nZXROdW1EYXRhQ29kZXdvcmRzKHZlcnNpb24sIG5ld0VjbCkgKiA4KSBlY2wgPSBuZXdFY2w7XG4gICAgICB9XG5cbiAgICAgIC8vIENvbmNhdGVuYXRlIGFsbCBzZWdtZW50cyB0byBjcmVhdGUgdGhlIGRhdGEgYml0IHN0cmluZ1xuICAgICAgbGV0IGJiOiBiaXRbXSA9IFtdO1xuICAgICAgZm9yIChjb25zdCBzZWcgb2Ygc2Vncykge1xuICAgICAgICBhcHBlbmRCaXRzKHNlZy5tb2RlLm1vZGVCaXRzLCA0LCBiYik7XG4gICAgICAgIGFwcGVuZEJpdHMoc2VnLm51bUNoYXJzLCBzZWcubW9kZS5udW1DaGFyQ291bnRCaXRzKHZlcnNpb24pLCBiYik7XG4gICAgICAgIGZvciAoY29uc3QgYiBvZiBzZWcuZ2V0RGF0YSgpKSBiYi5wdXNoKGIpO1xuICAgICAgfVxuICAgICAgYXNzZXJ0KGJiLmxlbmd0aCA9PSBkYXRhVXNlZEJpdHMpO1xuXG4gICAgICAvLyBBZGQgdGVybWluYXRvciBhbmQgcGFkIHVwIHRvIGEgYnl0ZSBpZiBhcHBsaWNhYmxlXG4gICAgICBjb25zdCBkYXRhQ2FwYWNpdHlCaXRzOiBpbnQgPSBRckNvZGUuZ2V0TnVtRGF0YUNvZGV3b3Jkcyh2ZXJzaW9uLCBlY2wpICogODtcbiAgICAgIGFzc2VydChiYi5sZW5ndGggPD0gZGF0YUNhcGFjaXR5Qml0cyk7XG4gICAgICBhcHBlbmRCaXRzKDAsIE1hdGgubWluKDQsIGRhdGFDYXBhY2l0eUJpdHMgLSBiYi5sZW5ndGgpLCBiYik7XG4gICAgICBhcHBlbmRCaXRzKDAsICg4IC0gKGJiLmxlbmd0aCAlIDgpKSAlIDgsIGJiKTtcbiAgICAgIGFzc2VydChiYi5sZW5ndGggJSA4ID09IDApO1xuXG4gICAgICAvLyBQYWQgd2l0aCBhbHRlcm5hdGluZyBieXRlcyB1bnRpbCBkYXRhIGNhcGFjaXR5IGlzIHJlYWNoZWRcbiAgICAgIGZvciAobGV0IHBhZEJ5dGUgPSAweGVjOyBiYi5sZW5ndGggPCBkYXRhQ2FwYWNpdHlCaXRzOyBwYWRCeXRlIF49IDB4ZWMgXiAweDExKSBhcHBlbmRCaXRzKHBhZEJ5dGUsIDgsIGJiKTtcblxuICAgICAgLy8gUGFjayBiaXRzIGludG8gYnl0ZXMgaW4gYmlnIGVuZGlhblxuICAgICAgbGV0IGRhdGFDb2Rld29yZHM6IGJ5dGVbXSA9IFtdO1xuICAgICAgd2hpbGUgKGRhdGFDb2Rld29yZHMubGVuZ3RoICogOCA8IGJiLmxlbmd0aCkgZGF0YUNvZGV3b3Jkcy5wdXNoKDApO1xuICAgICAgYmIuZm9yRWFjaCgoYjogYml0LCBpOiBpbnQpID0+IChkYXRhQ29kZXdvcmRzW2kgPj4+IDNdIHw9IGIgPDwgKDcgLSAoaSAmIDcpKSkpO1xuXG4gICAgICAvLyBDcmVhdGUgdGhlIFFSIENvZGUgb2JqZWN0XG4gICAgICByZXR1cm4gbmV3IFFyQ29kZSh2ZXJzaW9uLCBlY2wsIGRhdGFDb2Rld29yZHMsIG1hc2spO1xuICAgIH1cblxuICAgIC8qLS0gRmllbGRzIC0tKi9cblxuICAgIC8vIFRoZSB3aWR0aCBhbmQgaGVpZ2h0IG9mIHRoaXMgUVIgQ29kZSwgbWVhc3VyZWQgaW4gbW9kdWxlcywgYmV0d2VlblxuICAgIC8vIDIxIGFuZCAxNzcgKGluY2x1c2l2ZSkuIFRoaXMgaXMgZXF1YWwgdG8gdmVyc2lvbiAqIDQgKyAxNy5cbiAgICBwdWJsaWMgcmVhZG9ubHkgc2l6ZTogaW50O1xuXG4gICAgLy8gVGhlIGluZGV4IG9mIHRoZSBtYXNrIHBhdHRlcm4gdXNlZCBpbiB0aGlzIFFSIENvZGUsIHdoaWNoIGlzIGJldHdlZW4gMCBhbmQgNyAoaW5jbHVzaXZlKS5cbiAgICAvLyBFdmVuIGlmIGEgUVIgQ29kZSBpcyBjcmVhdGVkIHdpdGggYXV0b21hdGljIG1hc2tpbmcgcmVxdWVzdGVkIChtYXNrID0gLTEpLFxuICAgIC8vIHRoZSByZXN1bHRpbmcgb2JqZWN0IHN0aWxsIGhhcyBhIG1hc2sgdmFsdWUgYmV0d2VlbiAwIGFuZCA3LlxuICAgIHB1YmxpYyByZWFkb25seSBtYXNrOiBpbnQ7XG5cbiAgICAvLyBUaGUgbW9kdWxlcyBvZiB0aGlzIFFSIENvZGUgKGZhbHNlID0gbGlnaHQsIHRydWUgPSBkYXJrKS5cbiAgICAvLyBJbW11dGFibGUgYWZ0ZXIgY29uc3RydWN0b3IgZmluaXNoZXMuIEFjY2Vzc2VkIHRocm91Z2ggZ2V0TW9kdWxlKCkuXG4gICAgcHJpdmF0ZSByZWFkb25seSBtb2R1bGVzOiBib29sZWFuW11bXSA9IFtdO1xuXG4gICAgLy8gSW5kaWNhdGVzIGZ1bmN0aW9uIG1vZHVsZXMgdGhhdCBhcmUgbm90IHN1YmplY3RlZCB0byBtYXNraW5nLiBEaXNjYXJkZWQgd2hlbiBjb25zdHJ1Y3RvciBmaW5pc2hlcy5cbiAgICBwcml2YXRlIHJlYWRvbmx5IGlzRnVuY3Rpb246IGJvb2xlYW5bXVtdID0gW107XG5cbiAgICAvKi0tIENvbnN0cnVjdG9yIChsb3cgbGV2ZWwpIGFuZCBmaWVsZHMgLS0qL1xuXG4gICAgLy8gQ3JlYXRlcyBhIG5ldyBRUiBDb2RlIHdpdGggdGhlIGdpdmVuIHZlcnNpb24gbnVtYmVyLFxuICAgIC8vIGVycm9yIGNvcnJlY3Rpb24gbGV2ZWwsIGRhdGEgY29kZXdvcmQgYnl0ZXMsIGFuZCBtYXNrIG51bWJlci5cbiAgICAvLyBUaGlzIGlzIGEgbG93LWxldmVsIEFQSSB0aGF0IG1vc3QgdXNlcnMgc2hvdWxkIG5vdCB1c2UgZGlyZWN0bHkuXG4gICAgLy8gQSBtaWQtbGV2ZWwgQVBJIGlzIHRoZSBlbmNvZGVTZWdtZW50cygpIGZ1bmN0aW9uLlxuICAgIHB1YmxpYyBjb25zdHJ1Y3RvcihcbiAgICAgIC8vIFRoZSB2ZXJzaW9uIG51bWJlciBvZiB0aGlzIFFSIENvZGUsIHdoaWNoIGlzIGJldHdlZW4gMSBhbmQgNDAgKGluY2x1c2l2ZSkuXG4gICAgICAvLyBUaGlzIGRldGVybWluZXMgdGhlIHNpemUgb2YgdGhpcyBiYXJjb2RlLlxuICAgICAgcHVibGljIHJlYWRvbmx5IHZlcnNpb246IGludCxcblxuICAgICAgLy8gVGhlIGVycm9yIGNvcnJlY3Rpb24gbGV2ZWwgdXNlZCBpbiB0aGlzIFFSIENvZGUuXG4gICAgICBwdWJsaWMgcmVhZG9ubHkgZXJyb3JDb3JyZWN0aW9uTGV2ZWw6IFFyQ29kZS5FY2MsXG5cbiAgICAgIGRhdGFDb2Rld29yZHM6IFJlYWRvbmx5PGJ5dGVbXT4sXG5cbiAgICAgIG1zazogaW50XG4gICAgKSB7XG4gICAgICAvLyBDaGVjayBzY2FsYXIgYXJndW1lbnRzXG4gICAgICBpZiAodmVyc2lvbiA8IFFyQ29kZS5NSU5fVkVSU0lPTiB8fCB2ZXJzaW9uID4gUXJDb2RlLk1BWF9WRVJTSU9OKVxuICAgICAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcignVmVyc2lvbiB2YWx1ZSBvdXQgb2YgcmFuZ2UnKTtcbiAgICAgIGlmIChtc2sgPCAtMSB8fCBtc2sgPiA3KSB0aHJvdyBuZXcgUmFuZ2VFcnJvcignTWFzayB2YWx1ZSBvdXQgb2YgcmFuZ2UnKTtcbiAgICAgIHRoaXMuc2l6ZSA9IHZlcnNpb24gKiA0ICsgMTc7XG5cbiAgICAgIC8vIEluaXRpYWxpemUgYm90aCBncmlkcyB0byBiZSBzaXplKnNpemUgYXJyYXlzIG9mIEJvb2xlYW4gZmFsc2VcbiAgICAgIGxldCByb3c6IGJvb2xlYW5bXSA9IFtdO1xuICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLnNpemU7IGkrKykgcm93LnB1c2goZmFsc2UpO1xuICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLnNpemU7IGkrKykge1xuICAgICAgICB0aGlzLm1vZHVsZXMucHVzaChyb3cuc2xpY2UoKSk7IC8vIEluaXRpYWxseSBhbGwgbGlnaHRcbiAgICAgICAgdGhpcy5pc0Z1bmN0aW9uLnB1c2gocm93LnNsaWNlKCkpO1xuICAgICAgfVxuXG4gICAgICAvLyBDb21wdXRlIEVDQywgZHJhdyBtb2R1bGVzXG4gICAgICB0aGlzLmRyYXdGdW5jdGlvblBhdHRlcm5zKCk7XG4gICAgICBjb25zdCBhbGxDb2Rld29yZHM6IGJ5dGVbXSA9IHRoaXMuYWRkRWNjQW5kSW50ZXJsZWF2ZShkYXRhQ29kZXdvcmRzKTtcbiAgICAgIHRoaXMuZHJhd0NvZGV3b3JkcyhhbGxDb2Rld29yZHMpO1xuXG4gICAgICAvLyBEbyBtYXNraW5nXG4gICAgICBpZiAobXNrID09IC0xKSB7XG4gICAgICAgIC8vIEF1dG9tYXRpY2FsbHkgY2hvb3NlIGJlc3QgbWFza1xuICAgICAgICBsZXQgbWluUGVuYWx0eTogaW50ID0gMTAwMDAwMDAwMDtcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCA4OyBpKyspIHtcbiAgICAgICAgICB0aGlzLmFwcGx5TWFzayhpKTtcbiAgICAgICAgICB0aGlzLmRyYXdGb3JtYXRCaXRzKGkpO1xuICAgICAgICAgIGNvbnN0IHBlbmFsdHk6IGludCA9IHRoaXMuZ2V0UGVuYWx0eVNjb3JlKCk7XG4gICAgICAgICAgaWYgKHBlbmFsdHkgPCBtaW5QZW5hbHR5KSB7XG4gICAgICAgICAgICBtc2sgPSBpO1xuICAgICAgICAgICAgbWluUGVuYWx0eSA9IHBlbmFsdHk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHRoaXMuYXBwbHlNYXNrKGkpOyAvLyBVbmRvZXMgdGhlIG1hc2sgZHVlIHRvIFhPUlxuICAgICAgICB9XG4gICAgICB9XG4gICAgICBhc3NlcnQobXNrID49IDAgJiYgbXNrIDw9IDcpO1xuICAgICAgdGhpcy5tYXNrID0gbXNrO1xuICAgICAgdGhpcy5hcHBseU1hc2sobXNrKTsgLy8gQXBwbHkgdGhlIGZpbmFsIGNob2ljZSBvZiBtYXNrXG4gICAgICB0aGlzLmRyYXdGb3JtYXRCaXRzKG1zayk7IC8vIE92ZXJ3cml0ZSBvbGQgZm9ybWF0IGJpdHNcblxuICAgICAgdGhpcy5pc0Z1bmN0aW9uID0gW107XG4gICAgfVxuXG4gICAgLyotLSBBY2Nlc3NvciBtZXRob2RzIC0tKi9cblxuICAgIC8vIFJldHVybnMgdGhlIGNvbG9yIG9mIHRoZSBtb2R1bGUgKHBpeGVsKSBhdCB0aGUgZ2l2ZW4gY29vcmRpbmF0ZXMsIHdoaWNoIGlzIGZhbHNlXG4gICAgLy8gZm9yIGxpZ2h0IG9yIHRydWUgZm9yIGRhcmsuIFRoZSB0b3AgbGVmdCBjb3JuZXIgaGFzIHRoZSBjb29yZGluYXRlcyAoeD0wLCB5PTApLlxuICAgIC8vIElmIHRoZSBnaXZlbiBjb29yZGluYXRlcyBhcmUgb3V0IG9mIGJvdW5kcywgdGhlbiBmYWxzZSAobGlnaHQpIGlzIHJldHVybmVkLlxuICAgIHB1YmxpYyBnZXRNb2R1bGUoeDogaW50LCB5OiBpbnQpOiBib29sZWFuIHtcbiAgICAgIHJldHVybiB4ID49IDAgJiYgeCA8IHRoaXMuc2l6ZSAmJiB5ID49IDAgJiYgeSA8IHRoaXMuc2l6ZSAmJiB0aGlzLm1vZHVsZXNbeV1beF07XG4gICAgfVxuXG4gICAgLy8gTW9kaWZpZWQgdG8gZXhwb3NlIG1vZHVsZXMgZm9yIGVhc3kgYWNjZXNzXG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9leHBsaWNpdC1mdW5jdGlvbi1yZXR1cm4tdHlwZVxuICAgIHB1YmxpYyBnZXRNb2R1bGVzKCkge1xuICAgICAgcmV0dXJuIHRoaXMubW9kdWxlcztcbiAgICB9XG5cbiAgICAvKi0tIFByaXZhdGUgaGVscGVyIG1ldGhvZHMgZm9yIGNvbnN0cnVjdG9yOiBEcmF3aW5nIGZ1bmN0aW9uIG1vZHVsZXMgLS0qL1xuXG4gICAgLy8gUmVhZHMgdGhpcyBvYmplY3QncyB2ZXJzaW9uIGZpZWxkLCBhbmQgZHJhd3MgYW5kIG1hcmtzIGFsbCBmdW5jdGlvbiBtb2R1bGVzLlxuICAgIHByaXZhdGUgZHJhd0Z1bmN0aW9uUGF0dGVybnMoKTogdm9pZCB7XG4gICAgICAvLyBEcmF3IGhvcml6b250YWwgYW5kIHZlcnRpY2FsIHRpbWluZyBwYXR0ZXJuc1xuICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLnNpemU7IGkrKykge1xuICAgICAgICB0aGlzLnNldEZ1bmN0aW9uTW9kdWxlKDYsIGksIGkgJSAyID09IDApO1xuICAgICAgICB0aGlzLnNldEZ1bmN0aW9uTW9kdWxlKGksIDYsIGkgJSAyID09IDApO1xuICAgICAgfVxuXG4gICAgICAvLyBEcmF3IDMgZmluZGVyIHBhdHRlcm5zIChhbGwgY29ybmVycyBleGNlcHQgYm90dG9tIHJpZ2h0OyBvdmVyd3JpdGVzIHNvbWUgdGltaW5nIG1vZHVsZXMpXG4gICAgICB0aGlzLmRyYXdGaW5kZXJQYXR0ZXJuKDMsIDMpO1xuICAgICAgdGhpcy5kcmF3RmluZGVyUGF0dGVybih0aGlzLnNpemUgLSA0LCAzKTtcbiAgICAgIHRoaXMuZHJhd0ZpbmRlclBhdHRlcm4oMywgdGhpcy5zaXplIC0gNCk7XG5cbiAgICAgIC8vIERyYXcgbnVtZXJvdXMgYWxpZ25tZW50IHBhdHRlcm5zXG4gICAgICBjb25zdCBhbGlnblBhdFBvczogaW50W10gPSB0aGlzLmdldEFsaWdubWVudFBhdHRlcm5Qb3NpdGlvbnMoKTtcbiAgICAgIGNvbnN0IG51bUFsaWduOiBpbnQgPSBhbGlnblBhdFBvcy5sZW5ndGg7XG4gICAgICBmb3IgKGxldCBpID0gMDsgaSA8IG51bUFsaWduOyBpKyspIHtcbiAgICAgICAgZm9yIChsZXQgaiA9IDA7IGogPCBudW1BbGlnbjsgaisrKSB7XG4gICAgICAgICAgLy8gRG9uJ3QgZHJhdyBvbiB0aGUgdGhyZWUgZmluZGVyIGNvcm5lcnNcbiAgICAgICAgICBpZiAoISgoaSA9PSAwICYmIGogPT0gMCkgfHwgKGkgPT0gMCAmJiBqID09IG51bUFsaWduIC0gMSkgfHwgKGkgPT0gbnVtQWxpZ24gLSAxICYmIGogPT0gMCkpKVxuICAgICAgICAgICAgdGhpcy5kcmF3QWxpZ25tZW50UGF0dGVybihhbGlnblBhdFBvc1tpXSwgYWxpZ25QYXRQb3Nbal0pO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIC8vIERyYXcgY29uZmlndXJhdGlvbiBkYXRhXG4gICAgICB0aGlzLmRyYXdGb3JtYXRCaXRzKDApOyAvLyBEdW1teSBtYXNrIHZhbHVlOyBvdmVyd3JpdHRlbiBsYXRlciBpbiB0aGUgY29uc3RydWN0b3JcbiAgICAgIHRoaXMuZHJhd1ZlcnNpb24oKTtcbiAgICB9XG5cbiAgICAvLyBEcmF3cyB0d28gY29waWVzIG9mIHRoZSBmb3JtYXQgYml0cyAod2l0aCBpdHMgb3duIGVycm9yIGNvcnJlY3Rpb24gY29kZSlcbiAgICAvLyBiYXNlZCBvbiB0aGUgZ2l2ZW4gbWFzayBhbmQgdGhpcyBvYmplY3QncyBlcnJvciBjb3JyZWN0aW9uIGxldmVsIGZpZWxkLlxuICAgIHByaXZhdGUgZHJhd0Zvcm1hdEJpdHMobWFzazogaW50KTogdm9pZCB7XG4gICAgICAvLyBDYWxjdWxhdGUgZXJyb3IgY29ycmVjdGlvbiBjb2RlIGFuZCBwYWNrIGJpdHNcbiAgICAgIGNvbnN0IGRhdGE6IGludCA9ICh0aGlzLmVycm9yQ29ycmVjdGlvbkxldmVsLmZvcm1hdEJpdHMgPDwgMykgfCBtYXNrOyAvLyBlcnJDb3JyTHZsIGlzIHVpbnQyLCBtYXNrIGlzIHVpbnQzXG4gICAgICBsZXQgcmVtOiBpbnQgPSBkYXRhO1xuICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCAxMDsgaSsrKSByZW0gPSAocmVtIDw8IDEpIF4gKChyZW0gPj4+IDkpICogMHg1MzcpO1xuICAgICAgY29uc3QgYml0cyA9ICgoZGF0YSA8PCAxMCkgfCByZW0pIF4gMHg1NDEyOyAvLyB1aW50MTVcbiAgICAgIGFzc2VydChiaXRzID4+PiAxNSA9PSAwKTtcblxuICAgICAgLy8gRHJhdyBmaXJzdCBjb3B5XG4gICAgICBmb3IgKGxldCBpID0gMDsgaSA8PSA1OyBpKyspIHRoaXMuc2V0RnVuY3Rpb25Nb2R1bGUoOCwgaSwgZ2V0Qml0KGJpdHMsIGkpKTtcbiAgICAgIHRoaXMuc2V0RnVuY3Rpb25Nb2R1bGUoOCwgNywgZ2V0Qml0KGJpdHMsIDYpKTtcbiAgICAgIHRoaXMuc2V0RnVuY3Rpb25Nb2R1bGUoOCwgOCwgZ2V0Qml0KGJpdHMsIDcpKTtcbiAgICAgIHRoaXMuc2V0RnVuY3Rpb25Nb2R1bGUoNywgOCwgZ2V0Qml0KGJpdHMsIDgpKTtcbiAgICAgIGZvciAobGV0IGkgPSA5OyBpIDwgMTU7IGkrKykgdGhpcy5zZXRGdW5jdGlvbk1vZHVsZSgxNCAtIGksIDgsIGdldEJpdChiaXRzLCBpKSk7XG5cbiAgICAgIC8vIERyYXcgc2Vjb25kIGNvcHlcbiAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgODsgaSsrKSB0aGlzLnNldEZ1bmN0aW9uTW9kdWxlKHRoaXMuc2l6ZSAtIDEgLSBpLCA4LCBnZXRCaXQoYml0cywgaSkpO1xuICAgICAgZm9yIChsZXQgaSA9IDg7IGkgPCAxNTsgaSsrKSB0aGlzLnNldEZ1bmN0aW9uTW9kdWxlKDgsIHRoaXMuc2l6ZSAtIDE1ICsgaSwgZ2V0Qml0KGJpdHMsIGkpKTtcbiAgICAgIHRoaXMuc2V0RnVuY3Rpb25Nb2R1bGUoOCwgdGhpcy5zaXplIC0gOCwgdHJ1ZSk7IC8vIEFsd2F5cyBkYXJrXG4gICAgfVxuXG4gICAgLy8gRHJhd3MgdHdvIGNvcGllcyBvZiB0aGUgdmVyc2lvbiBiaXRzICh3aXRoIGl0cyBvd24gZXJyb3IgY29ycmVjdGlvbiBjb2RlKSxcbiAgICAvLyBiYXNlZCBvbiB0aGlzIG9iamVjdCdzIHZlcnNpb24gZmllbGQsIGlmZiA3IDw9IHZlcnNpb24gPD0gNDAuXG4gICAgcHJpdmF0ZSBkcmF3VmVyc2lvbigpOiB2b2lkIHtcbiAgICAgIGlmICh0aGlzLnZlcnNpb24gPCA3KSByZXR1cm47XG5cbiAgICAgIC8vIENhbGN1bGF0ZSBlcnJvciBjb3JyZWN0aW9uIGNvZGUgYW5kIHBhY2sgYml0c1xuICAgICAgbGV0IHJlbTogaW50ID0gdGhpcy52ZXJzaW9uOyAvLyB2ZXJzaW9uIGlzIHVpbnQ2LCBpbiB0aGUgcmFuZ2UgWzcsIDQwXVxuICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCAxMjsgaSsrKSByZW0gPSAocmVtIDw8IDEpIF4gKChyZW0gPj4+IDExKSAqIDB4MWYyNSk7XG4gICAgICBjb25zdCBiaXRzOiBpbnQgPSAodGhpcy52ZXJzaW9uIDw8IDEyKSB8IHJlbTsgLy8gdWludDE4XG4gICAgICBhc3NlcnQoYml0cyA+Pj4gMTggPT0gMCk7XG5cbiAgICAgIC8vIERyYXcgdHdvIGNvcGllc1xuICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCAxODsgaSsrKSB7XG4gICAgICAgIGNvbnN0IGNvbG9yOiBib29sZWFuID0gZ2V0Qml0KGJpdHMsIGkpO1xuICAgICAgICBjb25zdCBhOiBpbnQgPSB0aGlzLnNpemUgLSAxMSArIChpICUgMyk7XG4gICAgICAgIGNvbnN0IGI6IGludCA9IE1hdGguZmxvb3IoaSAvIDMpO1xuICAgICAgICB0aGlzLnNldEZ1bmN0aW9uTW9kdWxlKGEsIGIsIGNvbG9yKTtcbiAgICAgICAgdGhpcy5zZXRGdW5jdGlvbk1vZHVsZShiLCBhLCBjb2xvcik7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gRHJhd3MgYSA5KjkgZmluZGVyIHBhdHRlcm4gaW5jbHVkaW5nIHRoZSBib3JkZXIgc2VwYXJhdG9yLFxuICAgIC8vIHdpdGggdGhlIGNlbnRlciBtb2R1bGUgYXQgKHgsIHkpLiBNb2R1bGVzIGNhbiBiZSBvdXQgb2YgYm91bmRzLlxuICAgIHByaXZhdGUgZHJhd0ZpbmRlclBhdHRlcm4oeDogaW50LCB5OiBpbnQpOiB2b2lkIHtcbiAgICAgIGZvciAobGV0IGR5ID0gLTQ7IGR5IDw9IDQ7IGR5KyspIHtcbiAgICAgICAgZm9yIChsZXQgZHggPSAtNDsgZHggPD0gNDsgZHgrKykge1xuICAgICAgICAgIGNvbnN0IGRpc3Q6IGludCA9IE1hdGgubWF4KE1hdGguYWJzKGR4KSwgTWF0aC5hYnMoZHkpKTsgLy8gQ2hlYnlzaGV2L2luZmluaXR5IG5vcm1cbiAgICAgICAgICBjb25zdCB4eDogaW50ID0geCArIGR4O1xuICAgICAgICAgIGNvbnN0IHl5OiBpbnQgPSB5ICsgZHk7XG4gICAgICAgICAgaWYgKHh4ID49IDAgJiYgeHggPCB0aGlzLnNpemUgJiYgeXkgPj0gMCAmJiB5eSA8IHRoaXMuc2l6ZSlcbiAgICAgICAgICAgIHRoaXMuc2V0RnVuY3Rpb25Nb2R1bGUoeHgsIHl5LCBkaXN0ICE9IDIgJiYgZGlzdCAhPSA0KTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIC8vIERyYXdzIGEgNSo1IGFsaWdubWVudCBwYXR0ZXJuLCB3aXRoIHRoZSBjZW50ZXIgbW9kdWxlXG4gICAgLy8gYXQgKHgsIHkpLiBBbGwgbW9kdWxlcyBtdXN0IGJlIGluIGJvdW5kcy5cbiAgICBwcml2YXRlIGRyYXdBbGlnbm1lbnRQYXR0ZXJuKHg6IGludCwgeTogaW50KTogdm9pZCB7XG4gICAgICBmb3IgKGxldCBkeSA9IC0yOyBkeSA8PSAyOyBkeSsrKSB7XG4gICAgICAgIGZvciAobGV0IGR4ID0gLTI7IGR4IDw9IDI7IGR4KyspXG4gICAgICAgICAgdGhpcy5zZXRGdW5jdGlvbk1vZHVsZSh4ICsgZHgsIHkgKyBkeSwgTWF0aC5tYXgoTWF0aC5hYnMoZHgpLCBNYXRoLmFicyhkeSkpICE9IDEpO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIFNldHMgdGhlIGNvbG9yIG9mIGEgbW9kdWxlIGFuZCBtYXJrcyBpdCBhcyBhIGZ1bmN0aW9uIG1vZHVsZS5cbiAgICAvLyBPbmx5IHVzZWQgYnkgdGhlIGNvbnN0cnVjdG9yLiBDb29yZGluYXRlcyBtdXN0IGJlIGluIGJvdW5kcy5cbiAgICBwcml2YXRlIHNldEZ1bmN0aW9uTW9kdWxlKHg6IGludCwgeTogaW50LCBpc0Rhcms6IGJvb2xlYW4pOiB2b2lkIHtcbiAgICAgIHRoaXMubW9kdWxlc1t5XVt4XSA9IGlzRGFyaztcbiAgICAgIHRoaXMuaXNGdW5jdGlvblt5XVt4XSA9IHRydWU7XG4gICAgfVxuXG4gICAgLyotLSBQcml2YXRlIGhlbHBlciBtZXRob2RzIGZvciBjb25zdHJ1Y3RvcjogQ29kZXdvcmRzIGFuZCBtYXNraW5nIC0tKi9cblxuICAgIC8vIFJldHVybnMgYSBuZXcgYnl0ZSBzdHJpbmcgcmVwcmVzZW50aW5nIHRoZSBnaXZlbiBkYXRhIHdpdGggdGhlIGFwcHJvcHJpYXRlIGVycm9yIGNvcnJlY3Rpb25cbiAgICAvLyBjb2Rld29yZHMgYXBwZW5kZWQgdG8gaXQsIGJhc2VkIG9uIHRoaXMgb2JqZWN0J3MgdmVyc2lvbiBhbmQgZXJyb3IgY29ycmVjdGlvbiBsZXZlbC5cbiAgICBwcml2YXRlIGFkZEVjY0FuZEludGVybGVhdmUoZGF0YTogUmVhZG9ubHk8Ynl0ZVtdPik6IGJ5dGVbXSB7XG4gICAgICBjb25zdCB2ZXI6IGludCA9IHRoaXMudmVyc2lvbjtcbiAgICAgIGNvbnN0IGVjbDogUXJDb2RlLkVjYyA9IHRoaXMuZXJyb3JDb3JyZWN0aW9uTGV2ZWw7XG4gICAgICBpZiAoZGF0YS5sZW5ndGggIT0gUXJDb2RlLmdldE51bURhdGFDb2Rld29yZHModmVyLCBlY2wpKSB0aHJvdyBuZXcgUmFuZ2VFcnJvcignSW52YWxpZCBhcmd1bWVudCcpO1xuXG4gICAgICAvLyBDYWxjdWxhdGUgcGFyYW1ldGVyIG51bWJlcnNcbiAgICAgIGNvbnN0IG51bUJsb2NrczogaW50ID0gUXJDb2RlLk5VTV9FUlJPUl9DT1JSRUNUSU9OX0JMT0NLU1tlY2wub3JkaW5hbF1bdmVyXTtcbiAgICAgIGNvbnN0IGJsb2NrRWNjTGVuOiBpbnQgPSBRckNvZGUuRUNDX0NPREVXT1JEU19QRVJfQkxPQ0tbZWNsLm9yZGluYWxdW3Zlcl07XG4gICAgICBjb25zdCByYXdDb2Rld29yZHM6IGludCA9IE1hdGguZmxvb3IoUXJDb2RlLmdldE51bVJhd0RhdGFNb2R1bGVzKHZlcikgLyA4KTtcbiAgICAgIGNvbnN0IG51bVNob3J0QmxvY2tzOiBpbnQgPSBudW1CbG9ja3MgLSAocmF3Q29kZXdvcmRzICUgbnVtQmxvY2tzKTtcbiAgICAgIGNvbnN0IHNob3J0QmxvY2tMZW46IGludCA9IE1hdGguZmxvb3IocmF3Q29kZXdvcmRzIC8gbnVtQmxvY2tzKTtcblxuICAgICAgLy8gU3BsaXQgZGF0YSBpbnRvIGJsb2NrcyBhbmQgYXBwZW5kIEVDQyB0byBlYWNoIGJsb2NrXG4gICAgICBsZXQgYmxvY2tzOiBieXRlW11bXSA9IFtdO1xuICAgICAgY29uc3QgcnNEaXY6IGJ5dGVbXSA9IFFyQ29kZS5yZWVkU29sb21vbkNvbXB1dGVEaXZpc29yKGJsb2NrRWNjTGVuKTtcbiAgICAgIGZvciAobGV0IGkgPSAwLCBrID0gMDsgaSA8IG51bUJsb2NrczsgaSsrKSB7XG4gICAgICAgIGxldCBkYXQ6IGJ5dGVbXSA9IGRhdGEuc2xpY2UoaywgayArIHNob3J0QmxvY2tMZW4gLSBibG9ja0VjY0xlbiArIChpIDwgbnVtU2hvcnRCbG9ja3MgPyAwIDogMSkpO1xuICAgICAgICBrICs9IGRhdC5sZW5ndGg7XG4gICAgICAgIGNvbnN0IGVjYzogYnl0ZVtdID0gUXJDb2RlLnJlZWRTb2xvbW9uQ29tcHV0ZVJlbWFpbmRlcihkYXQsIHJzRGl2KTtcbiAgICAgICAgaWYgKGkgPCBudW1TaG9ydEJsb2NrcykgZGF0LnB1c2goMCk7XG4gICAgICAgIGJsb2Nrcy5wdXNoKGRhdC5jb25jYXQoZWNjKSk7XG4gICAgICB9XG5cbiAgICAgIC8vIEludGVybGVhdmUgKG5vdCBjb25jYXRlbmF0ZSkgdGhlIGJ5dGVzIGZyb20gZXZlcnkgYmxvY2sgaW50byBhIHNpbmdsZSBzZXF1ZW5jZVxuICAgICAgbGV0IHJlc3VsdDogYnl0ZVtdID0gW107XG4gICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGJsb2Nrc1swXS5sZW5ndGg7IGkrKykge1xuICAgICAgICBibG9ja3MuZm9yRWFjaCgoYmxvY2ssIGopID0+IHtcbiAgICAgICAgICAvLyBTa2lwIHRoZSBwYWRkaW5nIGJ5dGUgaW4gc2hvcnQgYmxvY2tzXG4gICAgICAgICAgaWYgKGkgIT0gc2hvcnRCbG9ja0xlbiAtIGJsb2NrRWNjTGVuIHx8IGogPj0gbnVtU2hvcnRCbG9ja3MpIHJlc3VsdC5wdXNoKGJsb2NrW2ldKTtcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgICBhc3NlcnQocmVzdWx0Lmxlbmd0aCA9PSByYXdDb2Rld29yZHMpO1xuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG5cbiAgICAvLyBEcmF3cyB0aGUgZ2l2ZW4gc2VxdWVuY2Ugb2YgOC1iaXQgY29kZXdvcmRzIChkYXRhIGFuZCBlcnJvciBjb3JyZWN0aW9uKSBvbnRvIHRoZSBlbnRpcmVcbiAgICAvLyBkYXRhIGFyZWEgb2YgdGhpcyBRUiBDb2RlLiBGdW5jdGlvbiBtb2R1bGVzIG5lZWQgdG8gYmUgbWFya2VkIG9mZiBiZWZvcmUgdGhpcyBpcyBjYWxsZWQuXG4gICAgcHJpdmF0ZSBkcmF3Q29kZXdvcmRzKGRhdGE6IFJlYWRvbmx5PGJ5dGVbXT4pOiB2b2lkIHtcbiAgICAgIGlmIChkYXRhLmxlbmd0aCAhPSBNYXRoLmZsb29yKFFyQ29kZS5nZXROdW1SYXdEYXRhTW9kdWxlcyh0aGlzLnZlcnNpb24pIC8gOCkpXG4gICAgICAgIHRocm93IG5ldyBSYW5nZUVycm9yKCdJbnZhbGlkIGFyZ3VtZW50Jyk7XG4gICAgICBsZXQgaTogaW50ID0gMDsgLy8gQml0IGluZGV4IGludG8gdGhlIGRhdGFcbiAgICAgIC8vIERvIHRoZSBmdW5ueSB6aWd6YWcgc2NhblxuICAgICAgZm9yIChsZXQgcmlnaHQgPSB0aGlzLnNpemUgLSAxOyByaWdodCA+PSAxOyByaWdodCAtPSAyKSB7XG4gICAgICAgIC8vIEluZGV4IG9mIHJpZ2h0IGNvbHVtbiBpbiBlYWNoIGNvbHVtbiBwYWlyXG4gICAgICAgIGlmIChyaWdodCA9PSA2KSByaWdodCA9IDU7XG4gICAgICAgIGZvciAobGV0IHZlcnQgPSAwOyB2ZXJ0IDwgdGhpcy5zaXplOyB2ZXJ0KyspIHtcbiAgICAgICAgICAvLyBWZXJ0aWNhbCBjb3VudGVyXG4gICAgICAgICAgZm9yIChsZXQgaiA9IDA7IGogPCAyOyBqKyspIHtcbiAgICAgICAgICAgIGNvbnN0IHg6IGludCA9IHJpZ2h0IC0gajsgLy8gQWN0dWFsIHggY29vcmRpbmF0ZVxuICAgICAgICAgICAgY29uc3QgdXB3YXJkOiBib29sZWFuID0gKChyaWdodCArIDEpICYgMikgPT0gMDtcbiAgICAgICAgICAgIGNvbnN0IHk6IGludCA9IHVwd2FyZCA/IHRoaXMuc2l6ZSAtIDEgLSB2ZXJ0IDogdmVydDsgLy8gQWN0dWFsIHkgY29vcmRpbmF0ZVxuICAgICAgICAgICAgaWYgKCF0aGlzLmlzRnVuY3Rpb25beV1beF0gJiYgaSA8IGRhdGEubGVuZ3RoICogOCkge1xuICAgICAgICAgICAgICB0aGlzLm1vZHVsZXNbeV1beF0gPSBnZXRCaXQoZGF0YVtpID4+PiAzXSwgNyAtIChpICYgNykpO1xuICAgICAgICAgICAgICBpKys7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBJZiB0aGlzIFFSIENvZGUgaGFzIGFueSByZW1haW5kZXIgYml0cyAoMCB0byA3KSwgdGhleSB3ZXJlIGFzc2lnbmVkIGFzXG4gICAgICAgICAgICAvLyAwL2ZhbHNlL2xpZ2h0IGJ5IHRoZSBjb25zdHJ1Y3RvciBhbmQgYXJlIGxlZnQgdW5jaGFuZ2VkIGJ5IHRoaXMgbWV0aG9kXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgICBhc3NlcnQoaSA9PSBkYXRhLmxlbmd0aCAqIDgpO1xuICAgIH1cblxuICAgIC8vIFhPUnMgdGhlIGNvZGV3b3JkIG1vZHVsZXMgaW4gdGhpcyBRUiBDb2RlIHdpdGggdGhlIGdpdmVuIG1hc2sgcGF0dGVybi5cbiAgICAvLyBUaGUgZnVuY3Rpb24gbW9kdWxlcyBtdXN0IGJlIG1hcmtlZCBhbmQgdGhlIGNvZGV3b3JkIGJpdHMgbXVzdCBiZSBkcmF3blxuICAgIC8vIGJlZm9yZSBtYXNraW5nLiBEdWUgdG8gdGhlIGFyaXRobWV0aWMgb2YgWE9SLCBjYWxsaW5nIGFwcGx5TWFzaygpIHdpdGhcbiAgICAvLyB0aGUgc2FtZSBtYXNrIHZhbHVlIGEgc2Vjb25kIHRpbWUgd2lsbCB1bmRvIHRoZSBtYXNrLiBBIGZpbmFsIHdlbGwtZm9ybWVkXG4gICAgLy8gUVIgQ29kZSBuZWVkcyBleGFjdGx5IG9uZSAobm90IHplcm8sIHR3bywgZXRjLikgbWFzayBhcHBsaWVkLlxuICAgIHByaXZhdGUgYXBwbHlNYXNrKG1hc2s6IGludCk6IHZvaWQge1xuICAgICAgaWYgKG1hc2sgPCAwIHx8IG1hc2sgPiA3KSB0aHJvdyBuZXcgUmFuZ2VFcnJvcignTWFzayB2YWx1ZSBvdXQgb2YgcmFuZ2UnKTtcbiAgICAgIGZvciAobGV0IHkgPSAwOyB5IDwgdGhpcy5zaXplOyB5KyspIHtcbiAgICAgICAgZm9yIChsZXQgeCA9IDA7IHggPCB0aGlzLnNpemU7IHgrKykge1xuICAgICAgICAgIGxldCBpbnZlcnQ6IGJvb2xlYW47XG4gICAgICAgICAgc3dpdGNoIChtYXNrKSB7XG4gICAgICAgICAgICBjYXNlIDA6XG4gICAgICAgICAgICAgIGludmVydCA9ICh4ICsgeSkgJSAyID09IDA7XG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAxOlxuICAgICAgICAgICAgICBpbnZlcnQgPSB5ICUgMiA9PSAwO1xuICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgMjpcbiAgICAgICAgICAgICAgaW52ZXJ0ID0geCAlIDMgPT0gMDtcbiAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIDM6XG4gICAgICAgICAgICAgIGludmVydCA9ICh4ICsgeSkgJSAzID09IDA7XG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSA0OlxuICAgICAgICAgICAgICBpbnZlcnQgPSAoTWF0aC5mbG9vcih4IC8gMykgKyBNYXRoLmZsb29yKHkgLyAyKSkgJSAyID09IDA7XG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSA1OlxuICAgICAgICAgICAgICBpbnZlcnQgPSAoKHggKiB5KSAlIDIpICsgKCh4ICogeSkgJSAzKSA9PSAwO1xuICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgNjpcbiAgICAgICAgICAgICAgaW52ZXJ0ID0gKCgoeCAqIHkpICUgMikgKyAoKHggKiB5KSAlIDMpKSAlIDIgPT0gMDtcbiAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIDc6XG4gICAgICAgICAgICAgIGludmVydCA9ICgoKHggKyB5KSAlIDIpICsgKCh4ICogeSkgJSAzKSkgJSAyID09IDA7XG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdVbnJlYWNoYWJsZScpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoIXRoaXMuaXNGdW5jdGlvblt5XVt4XSAmJiBpbnZlcnQpIHRoaXMubW9kdWxlc1t5XVt4XSA9ICF0aGlzLm1vZHVsZXNbeV1beF07XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBDYWxjdWxhdGVzIGFuZCByZXR1cm5zIHRoZSBwZW5hbHR5IHNjb3JlIGJhc2VkIG9uIHN0YXRlIG9mIHRoaXMgUVIgQ29kZSdzIGN1cnJlbnQgbW9kdWxlcy5cbiAgICAvLyBUaGlzIGlzIHVzZWQgYnkgdGhlIGF1dG9tYXRpYyBtYXNrIGNob2ljZSBhbGdvcml0aG0gdG8gZmluZCB0aGUgbWFzayBwYXR0ZXJuIHRoYXQgeWllbGRzIHRoZSBsb3dlc3Qgc2NvcmUuXG4gICAgcHJpdmF0ZSBnZXRQZW5hbHR5U2NvcmUoKTogaW50IHtcbiAgICAgIGxldCByZXN1bHQ6IGludCA9IDA7XG5cbiAgICAgIC8vIEFkamFjZW50IG1vZHVsZXMgaW4gcm93IGhhdmluZyBzYW1lIGNvbG9yLCBhbmQgZmluZGVyLWxpa2UgcGF0dGVybnNcbiAgICAgIGZvciAobGV0IHkgPSAwOyB5IDwgdGhpcy5zaXplOyB5KyspIHtcbiAgICAgICAgbGV0IHJ1bkNvbG9yID0gZmFsc2U7XG4gICAgICAgIGxldCBydW5YID0gMDtcbiAgICAgICAgbGV0IHJ1bkhpc3RvcnkgPSBbMCwgMCwgMCwgMCwgMCwgMCwgMF07XG4gICAgICAgIGZvciAobGV0IHggPSAwOyB4IDwgdGhpcy5zaXplOyB4KyspIHtcbiAgICAgICAgICBpZiAodGhpcy5tb2R1bGVzW3ldW3hdID09IHJ1bkNvbG9yKSB7XG4gICAgICAgICAgICBydW5YKys7XG4gICAgICAgICAgICBpZiAocnVuWCA9PSA1KSByZXN1bHQgKz0gUXJDb2RlLlBFTkFMVFlfTjE7XG4gICAgICAgICAgICBlbHNlIGlmIChydW5YID4gNSkgcmVzdWx0Kys7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuZmluZGVyUGVuYWx0eUFkZEhpc3RvcnkocnVuWCwgcnVuSGlzdG9yeSk7XG4gICAgICAgICAgICBpZiAoIXJ1bkNvbG9yKSByZXN1bHQgKz0gdGhpcy5maW5kZXJQZW5hbHR5Q291bnRQYXR0ZXJucyhydW5IaXN0b3J5KSAqIFFyQ29kZS5QRU5BTFRZX04zO1xuICAgICAgICAgICAgcnVuQ29sb3IgPSB0aGlzLm1vZHVsZXNbeV1beF07XG4gICAgICAgICAgICBydW5YID0gMTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmVzdWx0ICs9IHRoaXMuZmluZGVyUGVuYWx0eVRlcm1pbmF0ZUFuZENvdW50KHJ1bkNvbG9yLCBydW5YLCBydW5IaXN0b3J5KSAqIFFyQ29kZS5QRU5BTFRZX04zO1xuICAgICAgfVxuICAgICAgLy8gQWRqYWNlbnQgbW9kdWxlcyBpbiBjb2x1bW4gaGF2aW5nIHNhbWUgY29sb3IsIGFuZCBmaW5kZXItbGlrZSBwYXR0ZXJuc1xuICAgICAgZm9yIChsZXQgeCA9IDA7IHggPCB0aGlzLnNpemU7IHgrKykge1xuICAgICAgICBsZXQgcnVuQ29sb3IgPSBmYWxzZTtcbiAgICAgICAgbGV0IHJ1blkgPSAwO1xuICAgICAgICBsZXQgcnVuSGlzdG9yeSA9IFswLCAwLCAwLCAwLCAwLCAwLCAwXTtcbiAgICAgICAgZm9yIChsZXQgeSA9IDA7IHkgPCB0aGlzLnNpemU7IHkrKykge1xuICAgICAgICAgIGlmICh0aGlzLm1vZHVsZXNbeV1beF0gPT0gcnVuQ29sb3IpIHtcbiAgICAgICAgICAgIHJ1blkrKztcbiAgICAgICAgICAgIGlmIChydW5ZID09IDUpIHJlc3VsdCArPSBRckNvZGUuUEVOQUxUWV9OMTtcbiAgICAgICAgICAgIGVsc2UgaWYgKHJ1blkgPiA1KSByZXN1bHQrKztcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5maW5kZXJQZW5hbHR5QWRkSGlzdG9yeShydW5ZLCBydW5IaXN0b3J5KTtcbiAgICAgICAgICAgIGlmICghcnVuQ29sb3IpIHJlc3VsdCArPSB0aGlzLmZpbmRlclBlbmFsdHlDb3VudFBhdHRlcm5zKHJ1bkhpc3RvcnkpICogUXJDb2RlLlBFTkFMVFlfTjM7XG4gICAgICAgICAgICBydW5Db2xvciA9IHRoaXMubW9kdWxlc1t5XVt4XTtcbiAgICAgICAgICAgIHJ1blkgPSAxO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXN1bHQgKz0gdGhpcy5maW5kZXJQZW5hbHR5VGVybWluYXRlQW5kQ291bnQocnVuQ29sb3IsIHJ1blksIHJ1bkhpc3RvcnkpICogUXJDb2RlLlBFTkFMVFlfTjM7XG4gICAgICB9XG5cbiAgICAgIC8vIDIqMiBibG9ja3Mgb2YgbW9kdWxlcyBoYXZpbmcgc2FtZSBjb2xvclxuICAgICAgZm9yIChsZXQgeSA9IDA7IHkgPCB0aGlzLnNpemUgLSAxOyB5KyspIHtcbiAgICAgICAgZm9yIChsZXQgeCA9IDA7IHggPCB0aGlzLnNpemUgLSAxOyB4KyspIHtcbiAgICAgICAgICBjb25zdCBjb2xvcjogYm9vbGVhbiA9IHRoaXMubW9kdWxlc1t5XVt4XTtcbiAgICAgICAgICBpZiAoY29sb3IgPT0gdGhpcy5tb2R1bGVzW3ldW3ggKyAxXSAmJiBjb2xvciA9PSB0aGlzLm1vZHVsZXNbeSArIDFdW3hdICYmIGNvbG9yID09IHRoaXMubW9kdWxlc1t5ICsgMV1beCArIDFdKVxuICAgICAgICAgICAgcmVzdWx0ICs9IFFyQ29kZS5QRU5BTFRZX04yO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIC8vIEJhbGFuY2Ugb2YgZGFyayBhbmQgbGlnaHQgbW9kdWxlc1xuICAgICAgbGV0IGRhcms6IGludCA9IDA7XG4gICAgICBmb3IgKGNvbnN0IHJvdyBvZiB0aGlzLm1vZHVsZXMpIGRhcmsgPSByb3cucmVkdWNlKChzdW0sIGNvbG9yKSA9PiBzdW0gKyAoY29sb3IgPyAxIDogMCksIGRhcmspO1xuICAgICAgY29uc3QgdG90YWw6IGludCA9IHRoaXMuc2l6ZSAqIHRoaXMuc2l6ZTsgLy8gTm90ZSB0aGF0IHNpemUgaXMgb2RkLCBzbyBkYXJrL3RvdGFsICE9IDEvMlxuICAgICAgLy8gQ29tcHV0ZSB0aGUgc21hbGxlc3QgaW50ZWdlciBrID49IDAgc3VjaCB0aGF0ICg0NS01ayklIDw9IGRhcmsvdG90YWwgPD0gKDU1KzVrKSVcbiAgICAgIGNvbnN0IGs6IGludCA9IE1hdGguY2VpbChNYXRoLmFicyhkYXJrICogMjAgLSB0b3RhbCAqIDEwKSAvIHRvdGFsKSAtIDE7XG4gICAgICBhc3NlcnQoayA+PSAwICYmIGsgPD0gOSk7XG4gICAgICByZXN1bHQgKz0gayAqIFFyQ29kZS5QRU5BTFRZX040O1xuICAgICAgYXNzZXJ0KHJlc3VsdCA+PSAwICYmIHJlc3VsdCA8PSAyNTY4ODg4KTsgLy8gTm9uLXRpZ2h0IHVwcGVyIGJvdW5kIGJhc2VkIG9uIGRlZmF1bHQgdmFsdWVzIG9mIFBFTkFMVFlfTjEsIC4uLiwgTjRcbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxuXG4gICAgLyotLSBQcml2YXRlIGhlbHBlciBmdW5jdGlvbnMgLS0qL1xuXG4gICAgLy8gUmV0dXJucyBhbiBhc2NlbmRpbmcgbGlzdCBvZiBwb3NpdGlvbnMgb2YgYWxpZ25tZW50IHBhdHRlcm5zIGZvciB0aGlzIHZlcnNpb24gbnVtYmVyLlxuICAgIC8vIEVhY2ggcG9zaXRpb24gaXMgaW4gdGhlIHJhbmdlIFswLDE3NyksIGFuZCBhcmUgdXNlZCBvbiBib3RoIHRoZSB4IGFuZCB5IGF4ZXMuXG4gICAgLy8gVGhpcyBjb3VsZCBiZSBpbXBsZW1lbnRlZCBhcyBsb29rdXAgdGFibGUgb2YgNDAgdmFyaWFibGUtbGVuZ3RoIGxpc3RzIG9mIGludGVnZXJzLlxuICAgIHByaXZhdGUgZ2V0QWxpZ25tZW50UGF0dGVyblBvc2l0aW9ucygpOiBpbnRbXSB7XG4gICAgICBpZiAodGhpcy52ZXJzaW9uID09IDEpIHJldHVybiBbXTtcbiAgICAgIGVsc2Uge1xuICAgICAgICBjb25zdCBudW1BbGlnbjogaW50ID0gTWF0aC5mbG9vcih0aGlzLnZlcnNpb24gLyA3KSArIDI7XG4gICAgICAgIGNvbnN0IHN0ZXA6IGludCA9IHRoaXMudmVyc2lvbiA9PSAzMiA/IDI2IDogTWF0aC5jZWlsKCh0aGlzLnZlcnNpb24gKiA0ICsgNCkgLyAobnVtQWxpZ24gKiAyIC0gMikpICogMjtcbiAgICAgICAgbGV0IHJlc3VsdDogaW50W10gPSBbNl07XG4gICAgICAgIGZvciAobGV0IHBvcyA9IHRoaXMuc2l6ZSAtIDc7IHJlc3VsdC5sZW5ndGggPCBudW1BbGlnbjsgcG9zIC09IHN0ZXApIHJlc3VsdC5zcGxpY2UoMSwgMCwgcG9zKTtcbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBSZXR1cm5zIHRoZSBudW1iZXIgb2YgZGF0YSBiaXRzIHRoYXQgY2FuIGJlIHN0b3JlZCBpbiBhIFFSIENvZGUgb2YgdGhlIGdpdmVuIHZlcnNpb24gbnVtYmVyLCBhZnRlclxuICAgIC8vIGFsbCBmdW5jdGlvbiBtb2R1bGVzIGFyZSBleGNsdWRlZC4gVGhpcyBpbmNsdWRlcyByZW1haW5kZXIgYml0cywgc28gaXQgbWlnaHQgbm90IGJlIGEgbXVsdGlwbGUgb2YgOC5cbiAgICAvLyBUaGUgcmVzdWx0IGlzIGluIHRoZSByYW5nZSBbMjA4LCAyOTY0OF0uIFRoaXMgY291bGQgYmUgaW1wbGVtZW50ZWQgYXMgYSA0MC1lbnRyeSBsb29rdXAgdGFibGUuXG4gICAgcHJpdmF0ZSBzdGF0aWMgZ2V0TnVtUmF3RGF0YU1vZHVsZXModmVyOiBpbnQpOiBpbnQge1xuICAgICAgaWYgKHZlciA8IFFyQ29kZS5NSU5fVkVSU0lPTiB8fCB2ZXIgPiBRckNvZGUuTUFYX1ZFUlNJT04pIHRocm93IG5ldyBSYW5nZUVycm9yKCdWZXJzaW9uIG51bWJlciBvdXQgb2YgcmFuZ2UnKTtcbiAgICAgIGxldCByZXN1bHQ6IGludCA9ICgxNiAqIHZlciArIDEyOCkgKiB2ZXIgKyA2NDtcbiAgICAgIGlmICh2ZXIgPj0gMikge1xuICAgICAgICBjb25zdCBudW1BbGlnbjogaW50ID0gTWF0aC5mbG9vcih2ZXIgLyA3KSArIDI7XG4gICAgICAgIHJlc3VsdCAtPSAoMjUgKiBudW1BbGlnbiAtIDEwKSAqIG51bUFsaWduIC0gNTU7XG4gICAgICAgIGlmICh2ZXIgPj0gNykgcmVzdWx0IC09IDM2O1xuICAgICAgfVxuICAgICAgYXNzZXJ0KHJlc3VsdCA+PSAyMDggJiYgcmVzdWx0IDw9IDI5NjQ4KTtcbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxuXG4gICAgLy8gUmV0dXJucyB0aGUgbnVtYmVyIG9mIDgtYml0IGRhdGEgKGkuZS4gbm90IGVycm9yIGNvcnJlY3Rpb24pIGNvZGV3b3JkcyBjb250YWluZWQgaW4gYW55XG4gICAgLy8gUVIgQ29kZSBvZiB0aGUgZ2l2ZW4gdmVyc2lvbiBudW1iZXIgYW5kIGVycm9yIGNvcnJlY3Rpb24gbGV2ZWwsIHdpdGggcmVtYWluZGVyIGJpdHMgZGlzY2FyZGVkLlxuICAgIC8vIFRoaXMgc3RhdGVsZXNzIHB1cmUgZnVuY3Rpb24gY291bGQgYmUgaW1wbGVtZW50ZWQgYXMgYSAoNDAqNCktY2VsbCBsb29rdXAgdGFibGUuXG4gICAgcHJpdmF0ZSBzdGF0aWMgZ2V0TnVtRGF0YUNvZGV3b3Jkcyh2ZXI6IGludCwgZWNsOiBRckNvZGUuRWNjKTogaW50IHtcbiAgICAgIHJldHVybiAoXG4gICAgICAgIE1hdGguZmxvb3IoUXJDb2RlLmdldE51bVJhd0RhdGFNb2R1bGVzKHZlcikgLyA4KSAtXG4gICAgICAgIFFyQ29kZS5FQ0NfQ09ERVdPUkRTX1BFUl9CTE9DS1tlY2wub3JkaW5hbF1bdmVyXSAqIFFyQ29kZS5OVU1fRVJST1JfQ09SUkVDVElPTl9CTE9DS1NbZWNsLm9yZGluYWxdW3Zlcl1cbiAgICAgICk7XG4gICAgfVxuXG4gICAgLy8gUmV0dXJucyBhIFJlZWQtU29sb21vbiBFQ0MgZ2VuZXJhdG9yIHBvbHlub21pYWwgZm9yIHRoZSBnaXZlbiBkZWdyZWUuIFRoaXMgY291bGQgYmVcbiAgICAvLyBpbXBsZW1lbnRlZCBhcyBhIGxvb2t1cCB0YWJsZSBvdmVyIGFsbCBwb3NzaWJsZSBwYXJhbWV0ZXIgdmFsdWVzLCBpbnN0ZWFkIG9mIGFzIGFuIGFsZ29yaXRobS5cbiAgICBwcml2YXRlIHN0YXRpYyByZWVkU29sb21vbkNvbXB1dGVEaXZpc29yKGRlZ3JlZTogaW50KTogYnl0ZVtdIHtcbiAgICAgIGlmIChkZWdyZWUgPCAxIHx8IGRlZ3JlZSA+IDI1NSkgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ0RlZ3JlZSBvdXQgb2YgcmFuZ2UnKTtcbiAgICAgIC8vIFBvbHlub21pYWwgY29lZmZpY2llbnRzIGFyZSBzdG9yZWQgZnJvbSBoaWdoZXN0IHRvIGxvd2VzdCBwb3dlciwgZXhjbHVkaW5nIHRoZSBsZWFkaW5nIHRlcm0gd2hpY2ggaXMgYWx3YXlzIDEuXG4gICAgICAvLyBGb3IgZXhhbXBsZSB0aGUgcG9seW5vbWlhbCB4XjMgKyAyNTV4XjIgKyA4eCArIDkzIGlzIHN0b3JlZCBhcyB0aGUgdWludDggYXJyYXkgWzI1NSwgOCwgOTNdLlxuICAgICAgbGV0IHJlc3VsdDogYnl0ZVtdID0gW107XG4gICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGRlZ3JlZSAtIDE7IGkrKykgcmVzdWx0LnB1c2goMCk7XG4gICAgICByZXN1bHQucHVzaCgxKTsgLy8gU3RhcnQgb2ZmIHdpdGggdGhlIG1vbm9taWFsIHheMFxuXG4gICAgICAvLyBDb21wdXRlIHRoZSBwcm9kdWN0IHBvbHlub21pYWwgKHggLSByXjApICogKHggLSByXjEpICogKHggLSByXjIpICogLi4uICogKHggLSByXntkZWdyZWUtMX0pLFxuICAgICAgLy8gYW5kIGRyb3AgdGhlIGhpZ2hlc3QgbW9ub21pYWwgdGVybSB3aGljaCBpcyBhbHdheXMgMXheZGVncmVlLlxuICAgICAgLy8gTm90ZSB0aGF0IHIgPSAweDAyLCB3aGljaCBpcyBhIGdlbmVyYXRvciBlbGVtZW50IG9mIHRoaXMgZmllbGQgR0YoMl44LzB4MTFEKS5cbiAgICAgIGxldCByb290ID0gMTtcbiAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgZGVncmVlOyBpKyspIHtcbiAgICAgICAgLy8gTXVsdGlwbHkgdGhlIGN1cnJlbnQgcHJvZHVjdCBieSAoeCAtIHJeaSlcbiAgICAgICAgZm9yIChsZXQgaiA9IDA7IGogPCByZXN1bHQubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgICByZXN1bHRbal0gPSBRckNvZGUucmVlZFNvbG9tb25NdWx0aXBseShyZXN1bHRbal0sIHJvb3QpO1xuICAgICAgICAgIGlmIChqICsgMSA8IHJlc3VsdC5sZW5ndGgpIHJlc3VsdFtqXSBePSByZXN1bHRbaiArIDFdO1xuICAgICAgICB9XG4gICAgICAgIHJvb3QgPSBRckNvZGUucmVlZFNvbG9tb25NdWx0aXBseShyb290LCAweDAyKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxuXG4gICAgLy8gUmV0dXJucyB0aGUgUmVlZC1Tb2xvbW9uIGVycm9yIGNvcnJlY3Rpb24gY29kZXdvcmQgZm9yIHRoZSBnaXZlbiBkYXRhIGFuZCBkaXZpc29yIHBvbHlub21pYWxzLlxuICAgIHByaXZhdGUgc3RhdGljIHJlZWRTb2xvbW9uQ29tcHV0ZVJlbWFpbmRlcihkYXRhOiBSZWFkb25seTxieXRlW10+LCBkaXZpc29yOiBSZWFkb25seTxieXRlW10+KTogYnl0ZVtdIHtcbiAgICAgIGxldCByZXN1bHQ6IGJ5dGVbXSA9IGRpdmlzb3IubWFwKF8gPT4gMCk7XG4gICAgICBmb3IgKGNvbnN0IGIgb2YgZGF0YSkge1xuICAgICAgICAvLyBQb2x5bm9taWFsIGRpdmlzaW9uXG4gICAgICAgIGNvbnN0IGZhY3RvcjogYnl0ZSA9IGIgXiAocmVzdWx0LnNoaWZ0KCkgYXMgYnl0ZSk7XG4gICAgICAgIHJlc3VsdC5wdXNoKDApO1xuICAgICAgICBkaXZpc29yLmZvckVhY2goKGNvZWYsIGkpID0+IChyZXN1bHRbaV0gXj0gUXJDb2RlLnJlZWRTb2xvbW9uTXVsdGlwbHkoY29lZiwgZmFjdG9yKSkpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG5cbiAgICAvLyBSZXR1cm5zIHRoZSBwcm9kdWN0IG9mIHRoZSB0d28gZ2l2ZW4gZmllbGQgZWxlbWVudHMgbW9kdWxvIEdGKDJeOC8weDExRCkuIFRoZSBhcmd1bWVudHMgYW5kIHJlc3VsdFxuICAgIC8vIGFyZSB1bnNpZ25lZCA4LWJpdCBpbnRlZ2Vycy4gVGhpcyBjb3VsZCBiZSBpbXBsZW1lbnRlZCBhcyBhIGxvb2t1cCB0YWJsZSBvZiAyNTYqMjU2IGVudHJpZXMgb2YgdWludDguXG4gICAgcHJpdmF0ZSBzdGF0aWMgcmVlZFNvbG9tb25NdWx0aXBseSh4OiBieXRlLCB5OiBieXRlKTogYnl0ZSB7XG4gICAgICBpZiAoeCA+Pj4gOCAhPSAwIHx8IHkgPj4+IDggIT0gMCkgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ0J5dGUgb3V0IG9mIHJhbmdlJyk7XG4gICAgICAvLyBSdXNzaWFuIHBlYXNhbnQgbXVsdGlwbGljYXRpb25cbiAgICAgIGxldCB6OiBpbnQgPSAwO1xuICAgICAgZm9yIChsZXQgaSA9IDc7IGkgPj0gMDsgaS0tKSB7XG4gICAgICAgIHogPSAoeiA8PCAxKSBeICgoeiA+Pj4gNykgKiAweDExZCk7XG4gICAgICAgIHogXj0gKCh5ID4+PiBpKSAmIDEpICogeDtcbiAgICAgIH1cbiAgICAgIGFzc2VydCh6ID4+PiA4ID09IDApO1xuICAgICAgcmV0dXJuIHogYXMgYnl0ZTtcbiAgICB9XG5cbiAgICAvLyBDYW4gb25seSBiZSBjYWxsZWQgaW1tZWRpYXRlbHkgYWZ0ZXIgYSBsaWdodCBydW4gaXMgYWRkZWQsIGFuZFxuICAgIC8vIHJldHVybnMgZWl0aGVyIDAsIDEsIG9yIDIuIEEgaGVscGVyIGZ1bmN0aW9uIGZvciBnZXRQZW5hbHR5U2NvcmUoKS5cbiAgICBwcml2YXRlIGZpbmRlclBlbmFsdHlDb3VudFBhdHRlcm5zKHJ1bkhpc3Rvcnk6IFJlYWRvbmx5PGludFtdPik6IGludCB7XG4gICAgICBjb25zdCBuOiBpbnQgPSBydW5IaXN0b3J5WzFdO1xuICAgICAgYXNzZXJ0KG4gPD0gdGhpcy5zaXplICogMyk7XG4gICAgICBjb25zdCBjb3JlOiBib29sZWFuID1cbiAgICAgICAgbiA+IDAgJiYgcnVuSGlzdG9yeVsyXSA9PSBuICYmIHJ1bkhpc3RvcnlbM10gPT0gbiAqIDMgJiYgcnVuSGlzdG9yeVs0XSA9PSBuICYmIHJ1bkhpc3RvcnlbNV0gPT0gbjtcbiAgICAgIHJldHVybiAoXG4gICAgICAgIChjb3JlICYmIHJ1bkhpc3RvcnlbMF0gPj0gbiAqIDQgJiYgcnVuSGlzdG9yeVs2XSA+PSBuID8gMSA6IDApICtcbiAgICAgICAgKGNvcmUgJiYgcnVuSGlzdG9yeVs2XSA+PSBuICogNCAmJiBydW5IaXN0b3J5WzBdID49IG4gPyAxIDogMClcbiAgICAgICk7XG4gICAgfVxuXG4gICAgLy8gTXVzdCBiZSBjYWxsZWQgYXQgdGhlIGVuZCBvZiBhIGxpbmUgKHJvdyBvciBjb2x1bW4pIG9mIG1vZHVsZXMuIEEgaGVscGVyIGZ1bmN0aW9uIGZvciBnZXRQZW5hbHR5U2NvcmUoKS5cbiAgICBwcml2YXRlIGZpbmRlclBlbmFsdHlUZXJtaW5hdGVBbmRDb3VudChjdXJyZW50UnVuQ29sb3I6IGJvb2xlYW4sIGN1cnJlbnRSdW5MZW5ndGg6IGludCwgcnVuSGlzdG9yeTogaW50W10pOiBpbnQge1xuICAgICAgaWYgKGN1cnJlbnRSdW5Db2xvcikge1xuICAgICAgICAvLyBUZXJtaW5hdGUgZGFyayBydW5cbiAgICAgICAgdGhpcy5maW5kZXJQZW5hbHR5QWRkSGlzdG9yeShjdXJyZW50UnVuTGVuZ3RoLCBydW5IaXN0b3J5KTtcbiAgICAgICAgY3VycmVudFJ1bkxlbmd0aCA9IDA7XG4gICAgICB9XG4gICAgICBjdXJyZW50UnVuTGVuZ3RoICs9IHRoaXMuc2l6ZTsgLy8gQWRkIGxpZ2h0IGJvcmRlciB0byBmaW5hbCBydW5cbiAgICAgIHRoaXMuZmluZGVyUGVuYWx0eUFkZEhpc3RvcnkoY3VycmVudFJ1bkxlbmd0aCwgcnVuSGlzdG9yeSk7XG4gICAgICByZXR1cm4gdGhpcy5maW5kZXJQZW5hbHR5Q291bnRQYXR0ZXJucyhydW5IaXN0b3J5KTtcbiAgICB9XG5cbiAgICAvLyBQdXNoZXMgdGhlIGdpdmVuIHZhbHVlIHRvIHRoZSBmcm9udCBhbmQgZHJvcHMgdGhlIGxhc3QgdmFsdWUuIEEgaGVscGVyIGZ1bmN0aW9uIGZvciBnZXRQZW5hbHR5U2NvcmUoKS5cbiAgICBwcml2YXRlIGZpbmRlclBlbmFsdHlBZGRIaXN0b3J5KGN1cnJlbnRSdW5MZW5ndGg6IGludCwgcnVuSGlzdG9yeTogaW50W10pOiB2b2lkIHtcbiAgICAgIGlmIChydW5IaXN0b3J5WzBdID09IDApIGN1cnJlbnRSdW5MZW5ndGggKz0gdGhpcy5zaXplOyAvLyBBZGQgbGlnaHQgYm9yZGVyIHRvIGluaXRpYWwgcnVuXG4gICAgICBydW5IaXN0b3J5LnBvcCgpO1xuICAgICAgcnVuSGlzdG9yeS51bnNoaWZ0KGN1cnJlbnRSdW5MZW5ndGgpO1xuICAgIH1cblxuICAgIC8qLS0gQ29uc3RhbnRzIGFuZCB0YWJsZXMgLS0qL1xuXG4gICAgLy8gVGhlIG1pbmltdW0gdmVyc2lvbiBudW1iZXIgc3VwcG9ydGVkIGluIHRoZSBRUiBDb2RlIE1vZGVsIDIgc3RhbmRhcmQuXG4gICAgcHVibGljIHN0YXRpYyByZWFkb25seSBNSU5fVkVSU0lPTjogaW50ID0gMTtcbiAgICAvLyBUaGUgbWF4aW11bSB2ZXJzaW9uIG51bWJlciBzdXBwb3J0ZWQgaW4gdGhlIFFSIENvZGUgTW9kZWwgMiBzdGFuZGFyZC5cbiAgICBwdWJsaWMgc3RhdGljIHJlYWRvbmx5IE1BWF9WRVJTSU9OOiBpbnQgPSA0MDtcblxuICAgIC8vIEZvciB1c2UgaW4gZ2V0UGVuYWx0eVNjb3JlKCksIHdoZW4gZXZhbHVhdGluZyB3aGljaCBtYXNrIGlzIGJlc3QuXG4gICAgcHJpdmF0ZSBzdGF0aWMgcmVhZG9ubHkgUEVOQUxUWV9OMTogaW50ID0gMztcbiAgICBwcml2YXRlIHN0YXRpYyByZWFkb25seSBQRU5BTFRZX04yOiBpbnQgPSAzO1xuICAgIHByaXZhdGUgc3RhdGljIHJlYWRvbmx5IFBFTkFMVFlfTjM6IGludCA9IDQwO1xuICAgIHByaXZhdGUgc3RhdGljIHJlYWRvbmx5IFBFTkFMVFlfTjQ6IGludCA9IDEwO1xuXG4gICAgcHJpdmF0ZSBzdGF0aWMgcmVhZG9ubHkgRUNDX0NPREVXT1JEU19QRVJfQkxPQ0s6IGludFtdW10gPSBbXG4gICAgICAvLyBWZXJzaW9uOiAobm90ZSB0aGF0IGluZGV4IDAgaXMgZm9yIHBhZGRpbmcsIGFuZCBpcyBzZXQgdG8gYW4gaWxsZWdhbCB2YWx1ZSlcbiAgICAgIC8vMCwgIDEsICAyLCAgMywgIDQsICA1LCAgNiwgIDcsICA4LCAgOSwgMTAsIDExLCAxMiwgMTMsIDE0LCAxNSwgMTYsIDE3LCAxOCwgMTksIDIwLCAyMSwgMjIsIDIzLCAyNCwgMjUsIDI2LCAyNywgMjgsIDI5LCAzMCwgMzEsIDMyLCAzMywgMzQsIDM1LCAzNiwgMzcsIDM4LCAzOSwgNDAgICAgRXJyb3IgY29ycmVjdGlvbiBsZXZlbFxuICAgICAgW1xuICAgICAgICAtMSwgNywgMTAsIDE1LCAyMCwgMjYsIDE4LCAyMCwgMjQsIDMwLCAxOCwgMjAsIDI0LCAyNiwgMzAsIDIyLCAyNCwgMjgsIDMwLCAyOCwgMjgsIDI4LCAyOCwgMzAsIDMwLCAyNiwgMjgsIDMwLFxuICAgICAgICAzMCwgMzAsIDMwLCAzMCwgMzAsIDMwLCAzMCwgMzAsIDMwLCAzMCwgMzAsIDMwLCAzMFxuICAgICAgXSwgLy8gTG93XG4gICAgICBbXG4gICAgICAgIC0xLCAxMCwgMTYsIDI2LCAxOCwgMjQsIDE2LCAxOCwgMjIsIDIyLCAyNiwgMzAsIDIyLCAyMiwgMjQsIDI0LCAyOCwgMjgsIDI2LCAyNiwgMjYsIDI2LCAyOCwgMjgsIDI4LCAyOCwgMjgsIDI4LFxuICAgICAgICAyOCwgMjgsIDI4LCAyOCwgMjgsIDI4LCAyOCwgMjgsIDI4LCAyOCwgMjgsIDI4LCAyOFxuICAgICAgXSwgLy8gTWVkaXVtXG4gICAgICBbXG4gICAgICAgIC0xLCAxMywgMjIsIDE4LCAyNiwgMTgsIDI0LCAxOCwgMjIsIDIwLCAyNCwgMjgsIDI2LCAyNCwgMjAsIDMwLCAyNCwgMjgsIDI4LCAyNiwgMzAsIDI4LCAzMCwgMzAsIDMwLCAzMCwgMjgsIDMwLFxuICAgICAgICAzMCwgMzAsIDMwLCAzMCwgMzAsIDMwLCAzMCwgMzAsIDMwLCAzMCwgMzAsIDMwLCAzMFxuICAgICAgXSwgLy8gUXVhcnRpbGVcbiAgICAgIFtcbiAgICAgICAgLTEsIDE3LCAyOCwgMjIsIDE2LCAyMiwgMjgsIDI2LCAyNiwgMjQsIDI4LCAyNCwgMjgsIDIyLCAyNCwgMjQsIDMwLCAyOCwgMjgsIDI2LCAyOCwgMzAsIDI0LCAzMCwgMzAsIDMwLCAzMCwgMzAsXG4gICAgICAgIDMwLCAzMCwgMzAsIDMwLCAzMCwgMzAsIDMwLCAzMCwgMzAsIDMwLCAzMCwgMzAsIDMwXG4gICAgICBdIC8vIEhpZ2hcbiAgICBdO1xuXG4gICAgcHJpdmF0ZSBzdGF0aWMgcmVhZG9ubHkgTlVNX0VSUk9SX0NPUlJFQ1RJT05fQkxPQ0tTOiBpbnRbXVtdID0gW1xuICAgICAgLy8gVmVyc2lvbjogKG5vdGUgdGhhdCBpbmRleCAwIGlzIGZvciBwYWRkaW5nLCBhbmQgaXMgc2V0IHRvIGFuIGlsbGVnYWwgdmFsdWUpXG4gICAgICAvLzAsIDEsIDIsIDMsIDQsIDUsIDYsIDcsIDgsIDksMTAsIDExLCAxMiwgMTMsIDE0LCAxNSwgMTYsIDE3LCAxOCwgMTksIDIwLCAyMSwgMjIsIDIzLCAyNCwgMjUsIDI2LCAyNywgMjgsIDI5LCAzMCwgMzEsIDMyLCAzMywgMzQsIDM1LCAzNiwgMzcsIDM4LCAzOSwgNDAgICAgRXJyb3IgY29ycmVjdGlvbiBsZXZlbFxuICAgICAgW1xuICAgICAgICAtMSwgMSwgMSwgMSwgMSwgMSwgMiwgMiwgMiwgMiwgNCwgNCwgNCwgNCwgNCwgNiwgNiwgNiwgNiwgNywgOCwgOCwgOSwgOSwgMTAsIDEyLCAxMiwgMTIsIDEzLCAxNCwgMTUsIDE2LCAxNywgMTgsXG4gICAgICAgIDE5LCAxOSwgMjAsIDIxLCAyMiwgMjQsIDI1XG4gICAgICBdLCAvLyBMb3dcbiAgICAgIFtcbiAgICAgICAgLTEsIDEsIDEsIDEsIDIsIDIsIDQsIDQsIDQsIDUsIDUsIDUsIDgsIDksIDksIDEwLCAxMCwgMTEsIDEzLCAxNCwgMTYsIDE3LCAxNywgMTgsIDIwLCAyMSwgMjMsIDI1LCAyNiwgMjgsIDI5LFxuICAgICAgICAzMSwgMzMsIDM1LCAzNywgMzgsIDQwLCA0MywgNDUsIDQ3LCA0OVxuICAgICAgXSwgLy8gTWVkaXVtXG4gICAgICBbXG4gICAgICAgIC0xLCAxLCAxLCAyLCAyLCA0LCA0LCA2LCA2LCA4LCA4LCA4LCAxMCwgMTIsIDE2LCAxMiwgMTcsIDE2LCAxOCwgMjEsIDIwLCAyMywgMjMsIDI1LCAyNywgMjksIDM0LCAzNCwgMzUsIDM4LCA0MCxcbiAgICAgICAgNDMsIDQ1LCA0OCwgNTEsIDUzLCA1NiwgNTksIDYyLCA2NSwgNjhcbiAgICAgIF0sIC8vIFF1YXJ0aWxlXG4gICAgICBbXG4gICAgICAgIC0xLCAxLCAxLCAyLCA0LCA0LCA0LCA1LCA2LCA4LCA4LCAxMSwgMTEsIDE2LCAxNiwgMTgsIDE2LCAxOSwgMjEsIDI1LCAyNSwgMjUsIDM0LCAzMCwgMzIsIDM1LCAzNywgNDAsIDQyLCA0NSxcbiAgICAgICAgNDgsIDUxLCA1NCwgNTcsIDYwLCA2MywgNjYsIDcwLCA3NCwgNzcsIDgxXG4gICAgICBdIC8vIEhpZ2hcbiAgICBdO1xuICB9XG5cbiAgLy8gQXBwZW5kcyB0aGUgZ2l2ZW4gbnVtYmVyIG9mIGxvdy1vcmRlciBiaXRzIG9mIHRoZSBnaXZlbiB2YWx1ZVxuICAvLyB0byB0aGUgZ2l2ZW4gYnVmZmVyLiBSZXF1aXJlcyAwIDw9IGxlbiA8PSAzMSBhbmQgMCA8PSB2YWwgPCAyXmxlbi5cbiAgZnVuY3Rpb24gYXBwZW5kQml0cyh2YWw6IGludCwgbGVuOiBpbnQsIGJiOiBiaXRbXSk6IHZvaWQge1xuICAgIGlmIChsZW4gPCAwIHx8IGxlbiA+IDMxIHx8IHZhbCA+Pj4gbGVuICE9IDApIHRocm93IG5ldyBSYW5nZUVycm9yKCdWYWx1ZSBvdXQgb2YgcmFuZ2UnKTtcbiAgICBmb3IgKFxuICAgICAgbGV0IGkgPSBsZW4gLSAxO1xuICAgICAgaSA+PSAwO1xuICAgICAgaS0tIC8vIEFwcGVuZCBiaXQgYnkgYml0XG4gICAgKVxuICAgICAgYmIucHVzaCgodmFsID4+PiBpKSAmIDEpO1xuICB9XG5cbiAgLy8gUmV0dXJucyB0cnVlIGlmZiB0aGUgaSd0aCBiaXQgb2YgeCBpcyBzZXQgdG8gMS5cbiAgZnVuY3Rpb24gZ2V0Qml0KHg6IGludCwgaTogaW50KTogYm9vbGVhbiB7XG4gICAgcmV0dXJuICgoeCA+Pj4gaSkgJiAxKSAhPSAwO1xuICB9XG5cbiAgLy8gVGhyb3dzIGFuIGV4Y2VwdGlvbiBpZiB0aGUgZ2l2ZW4gY29uZGl0aW9uIGlzIGZhbHNlLlxuICBmdW5jdGlvbiBhc3NlcnQoY29uZDogYm9vbGVhbik6IHZvaWQge1xuICAgIGlmICghY29uZCkgdGhyb3cgbmV3IEVycm9yKCdBc3NlcnRpb24gZXJyb3InKTtcbiAgfVxuXG4gIC8qLS0tLSBEYXRhIHNlZ21lbnQgY2xhc3MgLS0tLSovXG5cbiAgLypcbiAgICogQSBzZWdtZW50IG9mIGNoYXJhY3Rlci9iaW5hcnkvY29udHJvbCBkYXRhIGluIGEgUVIgQ29kZSBzeW1ib2wuXG4gICAqIEluc3RhbmNlcyBvZiB0aGlzIGNsYXNzIGFyZSBpbW11dGFibGUuXG4gICAqIFRoZSBtaWQtbGV2ZWwgd2F5IHRvIGNyZWF0ZSBhIHNlZ21lbnQgaXMgdG8gdGFrZSB0aGUgcGF5bG9hZCBkYXRhXG4gICAqIGFuZCBjYWxsIGEgc3RhdGljIGZhY3RvcnkgZnVuY3Rpb24gc3VjaCBhcyBRclNlZ21lbnQubWFrZU51bWVyaWMoKS5cbiAgICogVGhlIGxvdy1sZXZlbCB3YXkgdG8gY3JlYXRlIGEgc2VnbWVudCBpcyB0byBjdXN0b20tbWFrZSB0aGUgYml0IGJ1ZmZlclxuICAgKiBhbmQgY2FsbCB0aGUgUXJTZWdtZW50KCkgY29uc3RydWN0b3Igd2l0aCBhcHByb3ByaWF0ZSB2YWx1ZXMuXG4gICAqIFRoaXMgc2VnbWVudCBjbGFzcyBpbXBvc2VzIG5vIGxlbmd0aCByZXN0cmljdGlvbnMsIGJ1dCBRUiBDb2RlcyBoYXZlIHJlc3RyaWN0aW9ucy5cbiAgICogRXZlbiBpbiB0aGUgbW9zdCBmYXZvcmFibGUgY29uZGl0aW9ucywgYSBRUiBDb2RlIGNhbiBvbmx5IGhvbGQgNzA4OSBjaGFyYWN0ZXJzIG9mIGRhdGEuXG4gICAqIEFueSBzZWdtZW50IGxvbmdlciB0aGFuIHRoaXMgaXMgbWVhbmluZ2xlc3MgZm9yIHRoZSBwdXJwb3NlIG9mIGdlbmVyYXRpbmcgUVIgQ29kZXMuXG4gICAqL1xuICBleHBvcnQgY2xhc3MgUXJTZWdtZW50IHtcbiAgICAvKi0tIFN0YXRpYyBmYWN0b3J5IGZ1bmN0aW9ucyAobWlkIGxldmVsKSAtLSovXG5cbiAgICAvLyBSZXR1cm5zIGEgc2VnbWVudCByZXByZXNlbnRpbmcgdGhlIGdpdmVuIGJpbmFyeSBkYXRhIGVuY29kZWQgaW5cbiAgICAvLyBieXRlIG1vZGUuIEFsbCBpbnB1dCBieXRlIGFycmF5cyBhcmUgYWNjZXB0YWJsZS4gQW55IHRleHQgc3RyaW5nXG4gICAgLy8gY2FuIGJlIGNvbnZlcnRlZCB0byBVVEYtOCBieXRlcyBhbmQgZW5jb2RlZCBhcyBhIGJ5dGUgbW9kZSBzZWdtZW50LlxuICAgIHB1YmxpYyBzdGF0aWMgbWFrZUJ5dGVzKGRhdGE6IFJlYWRvbmx5PGJ5dGVbXT4pOiBRclNlZ21lbnQge1xuICAgICAgbGV0IGJiOiBiaXRbXSA9IFtdO1xuICAgICAgZm9yIChjb25zdCBiIG9mIGRhdGEpIGFwcGVuZEJpdHMoYiwgOCwgYmIpO1xuICAgICAgcmV0dXJuIG5ldyBRclNlZ21lbnQoUXJTZWdtZW50Lk1vZGUuQllURSwgZGF0YS5sZW5ndGgsIGJiKTtcbiAgICB9XG5cbiAgICAvLyBSZXR1cm5zIGEgc2VnbWVudCByZXByZXNlbnRpbmcgdGhlIGdpdmVuIHN0cmluZyBvZiBkZWNpbWFsIGRpZ2l0cyBlbmNvZGVkIGluIG51bWVyaWMgbW9kZS5cbiAgICBwdWJsaWMgc3RhdGljIG1ha2VOdW1lcmljKGRpZ2l0czogc3RyaW5nKTogUXJTZWdtZW50IHtcbiAgICAgIGlmICghUXJTZWdtZW50LmlzTnVtZXJpYyhkaWdpdHMpKSB0aHJvdyBuZXcgUmFuZ2VFcnJvcignU3RyaW5nIGNvbnRhaW5zIG5vbi1udW1lcmljIGNoYXJhY3RlcnMnKTtcbiAgICAgIGxldCBiYjogYml0W10gPSBbXTtcbiAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgZGlnaXRzLmxlbmd0aDsgKSB7XG4gICAgICAgIC8vIENvbnN1bWUgdXAgdG8gMyBkaWdpdHMgcGVyIGl0ZXJhdGlvblxuICAgICAgICBjb25zdCBuOiBpbnQgPSBNYXRoLm1pbihkaWdpdHMubGVuZ3RoIC0gaSwgMyk7XG4gICAgICAgIGFwcGVuZEJpdHMocGFyc2VJbnQoZGlnaXRzLnN1YnN0cmluZyhpLCBpICsgbiksIDEwKSwgbiAqIDMgKyAxLCBiYik7XG4gICAgICAgIGkgKz0gbjtcbiAgICAgIH1cbiAgICAgIHJldHVybiBuZXcgUXJTZWdtZW50KFFyU2VnbWVudC5Nb2RlLk5VTUVSSUMsIGRpZ2l0cy5sZW5ndGgsIGJiKTtcbiAgICB9XG5cbiAgICAvLyBSZXR1cm5zIGEgc2VnbWVudCByZXByZXNlbnRpbmcgdGhlIGdpdmVuIHRleHQgc3RyaW5nIGVuY29kZWQgaW4gYWxwaGFudW1lcmljIG1vZGUuXG4gICAgLy8gVGhlIGNoYXJhY3RlcnMgYWxsb3dlZCBhcmU6IDAgdG8gOSwgQSB0byBaICh1cHBlcmNhc2Ugb25seSksIHNwYWNlLFxuICAgIC8vIGRvbGxhciwgcGVyY2VudCwgYXN0ZXJpc2ssIHBsdXMsIGh5cGhlbiwgcGVyaW9kLCBzbGFzaCwgY29sb24uXG4gICAgcHVibGljIHN0YXRpYyBtYWtlQWxwaGFudW1lcmljKHRleHQ6IHN0cmluZyk6IFFyU2VnbWVudCB7XG4gICAgICBpZiAoIVFyU2VnbWVudC5pc0FscGhhbnVtZXJpYyh0ZXh0KSlcbiAgICAgICAgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ1N0cmluZyBjb250YWlucyB1bmVuY29kYWJsZSBjaGFyYWN0ZXJzIGluIGFscGhhbnVtZXJpYyBtb2RlJyk7XG4gICAgICBsZXQgYmI6IGJpdFtdID0gW107XG4gICAgICBsZXQgaTogaW50O1xuICAgICAgZm9yIChpID0gMDsgaSArIDIgPD0gdGV4dC5sZW5ndGg7IGkgKz0gMikge1xuICAgICAgICAvLyBQcm9jZXNzIGdyb3VwcyBvZiAyXG4gICAgICAgIGxldCB0ZW1wOiBpbnQgPSBRclNlZ21lbnQuQUxQSEFOVU1FUklDX0NIQVJTRVQuaW5kZXhPZih0ZXh0LmNoYXJBdChpKSkgKiA0NTtcbiAgICAgICAgdGVtcCArPSBRclNlZ21lbnQuQUxQSEFOVU1FUklDX0NIQVJTRVQuaW5kZXhPZih0ZXh0LmNoYXJBdChpICsgMSkpO1xuICAgICAgICBhcHBlbmRCaXRzKHRlbXAsIDExLCBiYik7XG4gICAgICB9XG4gICAgICBpZiAoaSA8IHRleHQubGVuZ3RoKVxuICAgICAgICAvLyAxIGNoYXJhY3RlciByZW1haW5pbmdcbiAgICAgICAgYXBwZW5kQml0cyhRclNlZ21lbnQuQUxQSEFOVU1FUklDX0NIQVJTRVQuaW5kZXhPZih0ZXh0LmNoYXJBdChpKSksIDYsIGJiKTtcbiAgICAgIHJldHVybiBuZXcgUXJTZWdtZW50KFFyU2VnbWVudC5Nb2RlLkFMUEhBTlVNRVJJQywgdGV4dC5sZW5ndGgsIGJiKTtcbiAgICB9XG5cbiAgICAvLyBSZXR1cm5zIGEgbmV3IG11dGFibGUgbGlzdCBvZiB6ZXJvIG9yIG1vcmUgc2VnbWVudHMgdG8gcmVwcmVzZW50IHRoZSBnaXZlbiBVbmljb2RlIHRleHQgc3RyaW5nLlxuICAgIC8vIFRoZSByZXN1bHQgbWF5IHVzZSB2YXJpb3VzIHNlZ21lbnQgbW9kZXMgYW5kIHN3aXRjaCBtb2RlcyB0byBvcHRpbWl6ZSB0aGUgbGVuZ3RoIG9mIHRoZSBiaXQgc3RyZWFtLlxuICAgIHB1YmxpYyBzdGF0aWMgbWFrZVNlZ21lbnRzKHRleHQ6IHN0cmluZyk6IFFyU2VnbWVudFtdIHtcbiAgICAgIC8vIFNlbGVjdCB0aGUgbW9zdCBlZmZpY2llbnQgc2VnbWVudCBlbmNvZGluZyBhdXRvbWF0aWNhbGx5XG4gICAgICBpZiAodGV4dCA9PSAnJykgcmV0dXJuIFtdO1xuICAgICAgZWxzZSBpZiAoUXJTZWdtZW50LmlzTnVtZXJpYyh0ZXh0KSkgcmV0dXJuIFtRclNlZ21lbnQubWFrZU51bWVyaWModGV4dCldO1xuICAgICAgZWxzZSBpZiAoUXJTZWdtZW50LmlzQWxwaGFudW1lcmljKHRleHQpKSByZXR1cm4gW1FyU2VnbWVudC5tYWtlQWxwaGFudW1lcmljKHRleHQpXTtcbiAgICAgIGVsc2UgcmV0dXJuIFtRclNlZ21lbnQubWFrZUJ5dGVzKFFyU2VnbWVudC50b1V0ZjhCeXRlQXJyYXkodGV4dCkpXTtcbiAgICB9XG5cbiAgICAvLyBSZXR1cm5zIGEgc2VnbWVudCByZXByZXNlbnRpbmcgYW4gRXh0ZW5kZWQgQ2hhbm5lbCBJbnRlcnByZXRhdGlvblxuICAgIC8vIChFQ0kpIGRlc2lnbmF0b3Igd2l0aCB0aGUgZ2l2ZW4gYXNzaWdubWVudCB2YWx1ZS5cbiAgICBwdWJsaWMgc3RhdGljIG1ha2VFY2koYXNzaWduVmFsOiBpbnQpOiBRclNlZ21lbnQge1xuICAgICAgbGV0IGJiOiBiaXRbXSA9IFtdO1xuICAgICAgaWYgKGFzc2lnblZhbCA8IDApIHRocm93IG5ldyBSYW5nZUVycm9yKCdFQ0kgYXNzaWdubWVudCB2YWx1ZSBvdXQgb2YgcmFuZ2UnKTtcbiAgICAgIGVsc2UgaWYgKGFzc2lnblZhbCA8IDEgPDwgNykgYXBwZW5kQml0cyhhc3NpZ25WYWwsIDgsIGJiKTtcbiAgICAgIGVsc2UgaWYgKGFzc2lnblZhbCA8IDEgPDwgMTQpIHtcbiAgICAgICAgYXBwZW5kQml0cygwYjEwLCAyLCBiYik7XG4gICAgICAgIGFwcGVuZEJpdHMoYXNzaWduVmFsLCAxNCwgYmIpO1xuICAgICAgfSBlbHNlIGlmIChhc3NpZ25WYWwgPCAxMDAwMDAwKSB7XG4gICAgICAgIGFwcGVuZEJpdHMoMGIxMTAsIDMsIGJiKTtcbiAgICAgICAgYXBwZW5kQml0cyhhc3NpZ25WYWwsIDIxLCBiYik7XG4gICAgICB9IGVsc2UgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ0VDSSBhc3NpZ25tZW50IHZhbHVlIG91dCBvZiByYW5nZScpO1xuICAgICAgcmV0dXJuIG5ldyBRclNlZ21lbnQoUXJTZWdtZW50Lk1vZGUuRUNJLCAwLCBiYik7XG4gICAgfVxuXG4gICAgLy8gVGVzdHMgd2hldGhlciB0aGUgZ2l2ZW4gc3RyaW5nIGNhbiBiZSBlbmNvZGVkIGFzIGEgc2VnbWVudCBpbiBudW1lcmljIG1vZGUuXG4gICAgLy8gQSBzdHJpbmcgaXMgZW5jb2RhYmxlIGlmZiBlYWNoIGNoYXJhY3RlciBpcyBpbiB0aGUgcmFuZ2UgMCB0byA5LlxuICAgIHB1YmxpYyBzdGF0aWMgaXNOdW1lcmljKHRleHQ6IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgICAgcmV0dXJuIFFyU2VnbWVudC5OVU1FUklDX1JFR0VYLnRlc3QodGV4dCk7XG4gICAgfVxuXG4gICAgLy8gVGVzdHMgd2hldGhlciB0aGUgZ2l2ZW4gc3RyaW5nIGNhbiBiZSBlbmNvZGVkIGFzIGEgc2VnbWVudCBpbiBhbHBoYW51bWVyaWMgbW9kZS5cbiAgICAvLyBBIHN0cmluZyBpcyBlbmNvZGFibGUgaWZmIGVhY2ggY2hhcmFjdGVyIGlzIGluIHRoZSBmb2xsb3dpbmcgc2V0OiAwIHRvIDksIEEgdG8gWlxuICAgIC8vICh1cHBlcmNhc2Ugb25seSksIHNwYWNlLCBkb2xsYXIsIHBlcmNlbnQsIGFzdGVyaXNrLCBwbHVzLCBoeXBoZW4sIHBlcmlvZCwgc2xhc2gsIGNvbG9uLlxuICAgIHB1YmxpYyBzdGF0aWMgaXNBbHBoYW51bWVyaWModGV4dDogc3RyaW5nKTogYm9vbGVhbiB7XG4gICAgICByZXR1cm4gUXJTZWdtZW50LkFMUEhBTlVNRVJJQ19SRUdFWC50ZXN0KHRleHQpO1xuICAgIH1cblxuICAgIC8qLS0gQ29uc3RydWN0b3IgKGxvdyBsZXZlbCkgYW5kIGZpZWxkcyAtLSovXG5cbiAgICAvLyBDcmVhdGVzIGEgbmV3IFFSIENvZGUgc2VnbWVudCB3aXRoIHRoZSBnaXZlbiBhdHRyaWJ1dGVzIGFuZCBkYXRhLlxuICAgIC8vIFRoZSBjaGFyYWN0ZXIgY291bnQgKG51bUNoYXJzKSBtdXN0IGFncmVlIHdpdGggdGhlIG1vZGUgYW5kIHRoZSBiaXQgYnVmZmVyIGxlbmd0aCxcbiAgICAvLyBidXQgdGhlIGNvbnN0cmFpbnQgaXNuJ3QgY2hlY2tlZC4gVGhlIGdpdmVuIGJpdCBidWZmZXIgaXMgY2xvbmVkIGFuZCBzdG9yZWQuXG4gICAgcHVibGljIGNvbnN0cnVjdG9yKFxuICAgICAgLy8gVGhlIG1vZGUgaW5kaWNhdG9yIG9mIHRoaXMgc2VnbWVudC5cbiAgICAgIHB1YmxpYyByZWFkb25seSBtb2RlOiBRclNlZ21lbnQuTW9kZSxcblxuICAgICAgLy8gVGhlIGxlbmd0aCBvZiB0aGlzIHNlZ21lbnQncyB1bmVuY29kZWQgZGF0YS4gTWVhc3VyZWQgaW4gY2hhcmFjdGVycyBmb3JcbiAgICAgIC8vIG51bWVyaWMvYWxwaGFudW1lcmljL2thbmppIG1vZGUsIGJ5dGVzIGZvciBieXRlIG1vZGUsIGFuZCAwIGZvciBFQ0kgbW9kZS5cbiAgICAgIC8vIEFsd2F5cyB6ZXJvIG9yIHBvc2l0aXZlLiBOb3QgdGhlIHNhbWUgYXMgdGhlIGRhdGEncyBiaXQgbGVuZ3RoLlxuICAgICAgcHVibGljIHJlYWRvbmx5IG51bUNoYXJzOiBpbnQsXG5cbiAgICAgIC8vIFRoZSBkYXRhIGJpdHMgb2YgdGhpcyBzZWdtZW50LiBBY2Nlc3NlZCB0aHJvdWdoIGdldERhdGEoKS5cbiAgICAgIHByaXZhdGUgcmVhZG9ubHkgYml0RGF0YTogYml0W11cbiAgICApIHtcbiAgICAgIGlmIChudW1DaGFycyA8IDApIHRocm93IG5ldyBSYW5nZUVycm9yKCdJbnZhbGlkIGFyZ3VtZW50Jyk7XG4gICAgICB0aGlzLmJpdERhdGEgPSBiaXREYXRhLnNsaWNlKCk7IC8vIE1ha2UgZGVmZW5zaXZlIGNvcHlcbiAgICB9XG5cbiAgICAvKi0tIE1ldGhvZHMgLS0qL1xuXG4gICAgLy8gUmV0dXJucyBhIG5ldyBjb3B5IG9mIHRoZSBkYXRhIGJpdHMgb2YgdGhpcyBzZWdtZW50LlxuICAgIHB1YmxpYyBnZXREYXRhKCk6IGJpdFtdIHtcbiAgICAgIHJldHVybiB0aGlzLmJpdERhdGEuc2xpY2UoKTsgLy8gTWFrZSBkZWZlbnNpdmUgY29weVxuICAgIH1cblxuICAgIC8vIChQYWNrYWdlLXByaXZhdGUpIENhbGN1bGF0ZXMgYW5kIHJldHVybnMgdGhlIG51bWJlciBvZiBiaXRzIG5lZWRlZCB0byBlbmNvZGUgdGhlIGdpdmVuIHNlZ21lbnRzIGF0XG4gICAgLy8gdGhlIGdpdmVuIHZlcnNpb24uIFRoZSByZXN1bHQgaXMgaW5maW5pdHkgaWYgYSBzZWdtZW50IGhhcyB0b28gbWFueSBjaGFyYWN0ZXJzIHRvIGZpdCBpdHMgbGVuZ3RoIGZpZWxkLlxuICAgIHB1YmxpYyBzdGF0aWMgZ2V0VG90YWxCaXRzKHNlZ3M6IFJlYWRvbmx5PFFyU2VnbWVudFtdPiwgdmVyc2lvbjogaW50KTogbnVtYmVyIHtcbiAgICAgIGxldCByZXN1bHQgPSAwO1xuICAgICAgZm9yIChjb25zdCBzZWcgb2Ygc2Vncykge1xuICAgICAgICBjb25zdCBjY2JpdHM6IGludCA9IHNlZy5tb2RlLm51bUNoYXJDb3VudEJpdHModmVyc2lvbik7XG4gICAgICAgIGlmIChzZWcubnVtQ2hhcnMgPj0gMSA8PCBjY2JpdHMpIHJldHVybiBJbmZpbml0eTsgLy8gVGhlIHNlZ21lbnQncyBsZW5ndGggZG9lc24ndCBmaXQgdGhlIGZpZWxkJ3MgYml0IHdpZHRoXG4gICAgICAgIHJlc3VsdCArPSA0ICsgY2NiaXRzICsgc2VnLmJpdERhdGEubGVuZ3RoO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG5cbiAgICAvLyBSZXR1cm5zIGEgbmV3IGFycmF5IG9mIGJ5dGVzIHJlcHJlc2VudGluZyB0aGUgZ2l2ZW4gc3RyaW5nIGVuY29kZWQgaW4gVVRGLTguXG4gICAgcHJpdmF0ZSBzdGF0aWMgdG9VdGY4Qnl0ZUFycmF5KHN0cjogc3RyaW5nKTogYnl0ZVtdIHtcbiAgICAgIHN0ciA9IGVuY29kZVVSSShzdHIpO1xuICAgICAgbGV0IHJlc3VsdDogYnl0ZVtdID0gW107XG4gICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHN0ci5sZW5ndGg7IGkrKykge1xuICAgICAgICBpZiAoc3RyLmNoYXJBdChpKSAhPSAnJScpIHJlc3VsdC5wdXNoKHN0ci5jaGFyQ29kZUF0KGkpKTtcbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgcmVzdWx0LnB1c2gocGFyc2VJbnQoc3RyLnN1YnN0cmluZyhpICsgMSwgaSArIDMpLCAxNikpO1xuICAgICAgICAgIGkgKz0gMjtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG5cbiAgICAvKi0tIENvbnN0YW50cyAtLSovXG5cbiAgICAvLyBEZXNjcmliZXMgcHJlY2lzZWx5IGFsbCBzdHJpbmdzIHRoYXQgYXJlIGVuY29kYWJsZSBpbiBudW1lcmljIG1vZGUuXG4gICAgcHJpdmF0ZSBzdGF0aWMgcmVhZG9ubHkgTlVNRVJJQ19SRUdFWDogUmVnRXhwID0gL15bMC05XSokLztcblxuICAgIC8vIERlc2NyaWJlcyBwcmVjaXNlbHkgYWxsIHN0cmluZ3MgdGhhdCBhcmUgZW5jb2RhYmxlIGluIGFscGhhbnVtZXJpYyBtb2RlLlxuICAgIHByaXZhdGUgc3RhdGljIHJlYWRvbmx5IEFMUEhBTlVNRVJJQ19SRUdFWDogUmVnRXhwID0gL15bQS1aMC05ICQlKisuXFwvOi1dKiQvO1xuXG4gICAgLy8gVGhlIHNldCBvZiBhbGwgbGVnYWwgY2hhcmFjdGVycyBpbiBhbHBoYW51bWVyaWMgbW9kZSxcbiAgICAvLyB3aGVyZSBlYWNoIGNoYXJhY3RlciB2YWx1ZSBtYXBzIHRvIHRoZSBpbmRleCBpbiB0aGUgc3RyaW5nLlxuICAgIHByaXZhdGUgc3RhdGljIHJlYWRvbmx5IEFMUEhBTlVNRVJJQ19DSEFSU0VUOiBzdHJpbmcgPSAnMDEyMzQ1Njc4OUFCQ0RFRkdISUpLTE1OT1BRUlNUVVZXWFlaICQlKistLi86JztcbiAgfVxufVxuXG4vKi0tLS0gUHVibGljIGhlbHBlciBlbnVtZXJhdGlvbiAtLS0tKi9cblxubmFtZXNwYWNlIHFyY29kZWdlbi5RckNvZGUge1xuICB0eXBlIGludCA9IG51bWJlcjtcblxuICAvKlxuICAgKiBUaGUgZXJyb3IgY29ycmVjdGlvbiBsZXZlbCBpbiBhIFFSIENvZGUgc3ltYm9sLiBJbW11dGFibGUuXG4gICAqL1xuICBleHBvcnQgY2xhc3MgRWNjIHtcbiAgICAvKi0tIENvbnN0YW50cyAtLSovXG5cbiAgICBwdWJsaWMgc3RhdGljIHJlYWRvbmx5IExPVyA9IG5ldyBFY2MoMCwgMSk7IC8vIFRoZSBRUiBDb2RlIGNhbiB0b2xlcmF0ZSBhYm91dCAgNyUgZXJyb25lb3VzIGNvZGV3b3Jkc1xuICAgIHB1YmxpYyBzdGF0aWMgcmVhZG9ubHkgTUVESVVNID0gbmV3IEVjYygxLCAwKTsgLy8gVGhlIFFSIENvZGUgY2FuIHRvbGVyYXRlIGFib3V0IDE1JSBlcnJvbmVvdXMgY29kZXdvcmRzXG4gICAgcHVibGljIHN0YXRpYyByZWFkb25seSBRVUFSVElMRSA9IG5ldyBFY2MoMiwgMyk7IC8vIFRoZSBRUiBDb2RlIGNhbiB0b2xlcmF0ZSBhYm91dCAyNSUgZXJyb25lb3VzIGNvZGV3b3Jkc1xuICAgIHB1YmxpYyBzdGF0aWMgcmVhZG9ubHkgSElHSCA9IG5ldyBFY2MoMywgMik7IC8vIFRoZSBRUiBDb2RlIGNhbiB0b2xlcmF0ZSBhYm91dCAzMCUgZXJyb25lb3VzIGNvZGV3b3Jkc1xuXG4gICAgLyotLSBDb25zdHJ1Y3RvciBhbmQgZmllbGRzIC0tKi9cblxuICAgIHByaXZhdGUgY29uc3RydWN0b3IoXG4gICAgICAvLyBJbiB0aGUgcmFuZ2UgMCB0byAzICh1bnNpZ25lZCAyLWJpdCBpbnRlZ2VyKS5cbiAgICAgIHB1YmxpYyByZWFkb25seSBvcmRpbmFsOiBpbnQsXG4gICAgICAvLyAoUGFja2FnZS1wcml2YXRlKSBJbiB0aGUgcmFuZ2UgMCB0byAzICh1bnNpZ25lZCAyLWJpdCBpbnRlZ2VyKS5cbiAgICAgIHB1YmxpYyByZWFkb25seSBmb3JtYXRCaXRzOiBpbnRcbiAgICApIHt9XG4gIH1cbn1cblxuLyotLS0tIFB1YmxpYyBoZWxwZXIgZW51bWVyYXRpb24gLS0tLSovXG5cbm5hbWVzcGFjZSBxcmNvZGVnZW4uUXJTZWdtZW50IHtcbiAgdHlwZSBpbnQgPSBudW1iZXI7XG5cbiAgLypcbiAgICogRGVzY3JpYmVzIGhvdyBhIHNlZ21lbnQncyBkYXRhIGJpdHMgYXJlIGludGVycHJldGVkLiBJbW11dGFibGUuXG4gICAqL1xuICBleHBvcnQgY2xhc3MgTW9kZSB7XG4gICAgLyotLSBDb25zdGFudHMgLS0qL1xuXG4gICAgcHVibGljIHN0YXRpYyByZWFkb25seSBOVU1FUklDID0gbmV3IE1vZGUoMHgxLCBbMTAsIDEyLCAxNF0pO1xuICAgIHB1YmxpYyBzdGF0aWMgcmVhZG9ubHkgQUxQSEFOVU1FUklDID0gbmV3IE1vZGUoMHgyLCBbOSwgMTEsIDEzXSk7XG4gICAgcHVibGljIHN0YXRpYyByZWFkb25seSBCWVRFID0gbmV3IE1vZGUoMHg0LCBbOCwgMTYsIDE2XSk7XG4gICAgcHVibGljIHN0YXRpYyByZWFkb25seSBLQU5KSSA9IG5ldyBNb2RlKDB4OCwgWzgsIDEwLCAxMl0pO1xuICAgIHB1YmxpYyBzdGF0aWMgcmVhZG9ubHkgRUNJID0gbmV3IE1vZGUoMHg3LCBbMCwgMCwgMF0pO1xuXG4gICAgLyotLSBDb25zdHJ1Y3RvciBhbmQgZmllbGRzIC0tKi9cblxuICAgIHByaXZhdGUgY29uc3RydWN0b3IoXG4gICAgICAvLyBUaGUgbW9kZSBpbmRpY2F0b3IgYml0cywgd2hpY2ggaXMgYSB1aW50NCB2YWx1ZSAocmFuZ2UgMCB0byAxNSkuXG4gICAgICBwdWJsaWMgcmVhZG9ubHkgbW9kZUJpdHM6IGludCxcbiAgICAgIC8vIE51bWJlciBvZiBjaGFyYWN0ZXIgY291bnQgYml0cyBmb3IgdGhyZWUgZGlmZmVyZW50IHZlcnNpb24gcmFuZ2VzLlxuICAgICAgcHJpdmF0ZSByZWFkb25seSBudW1CaXRzQ2hhckNvdW50OiBbaW50LCBpbnQsIGludF1cbiAgICApIHt9XG5cbiAgICAvKi0tIE1ldGhvZCAtLSovXG5cbiAgICAvLyAoUGFja2FnZS1wcml2YXRlKSBSZXR1cm5zIHRoZSBiaXQgd2lkdGggb2YgdGhlIGNoYXJhY3RlciBjb3VudCBmaWVsZCBmb3IgYSBzZWdtZW50IGluXG4gICAgLy8gdGhpcyBtb2RlIGluIGEgUVIgQ29kZSBhdCB0aGUgZ2l2ZW4gdmVyc2lvbiBudW1iZXIuIFRoZSByZXN1bHQgaXMgaW4gdGhlIHJhbmdlIFswLCAxNl0uXG4gICAgcHVibGljIG51bUNoYXJDb3VudEJpdHModmVyOiBpbnQpOiBpbnQge1xuICAgICAgcmV0dXJuIHRoaXMubnVtQml0c0NoYXJDb3VudFtNYXRoLmZsb29yKCh2ZXIgKyA3KSAvIDE3KV07XG4gICAgfVxuICB9XG59XG5cbi8vIE1vZGlmaWNhdGlvbiB0byBleHBvcnQgZm9yIGFjdHVhbCB1c2VcbmV4cG9ydCBkZWZhdWx0IHFyY29kZWdlbjtcbiJdfQ==