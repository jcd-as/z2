// math.js
// Copyright 2013 Joshua C Shepard
// math, incl vector & matrix, routines for zed-squared

/** Math module.
 * @module
 */


// helpers

/** @constant */
const D2R_CONVERSION_FACTOR = Math.PI/180
/** @constant */
const R2D_CONVERSION_FACTOR = 180/Math.PI

/** Convert degrees to radians. */
export function d2r(d)
{
	return d * D2R_CONVERSION_FACTOR
}

/** Convert radians to degrees. */
export function r2d(r)
{
	return r * R2D_CONVERSION_FACTOR
}


// vector math routines

/** Add two vectors. */
export function vecAdd(v1, v2, out)
{
	if(!out)
		out = v1
	out[0] = v1[0] + v2[0]
	out[1] = v1[1] + v2[1]
}

/** Subtract two vectors. */
export function vecSub(v1, v2, out)
{
	if(!out)
		out = v1
	out[0] = v1[0] - v2[0]
	out[1] = v1[1] - v2[1]
}

/** Multiply two vectors. */
export function vecMul(v1, v2, out)
{
	if(!out)
		out = v1
	out[0] = v1[0] * v2[0]
	out[1] = v1[1] * v2[1]
}

/** Divide two vectors. */
export function vecDiv(v1, v2, out)
{
	if(!out)
		out = v1
	out[0] = v1[0] / v2[0]
	out[1] = v1[1] / v2[1]
}

/** Add a scalar to a vector. */
export function vecAddTo(v, n, out)
{
	if(!out)
		out = v
	out[0] = v[0] * n
	out[1] = v[1] * n
}

/** Subtract a scalar from a vector. */
export function vecSubFrom(v, n, out)
{
	if(!out)
		out = v
	out[0] = v[0] - n
	out[1] = v[1] = n
}

/** Multiply a vector by a scalar. */
export function vecMulBy(v, n, out)
{
	if(!out)
		out = v
	out[0] = v[0] * n
	out[1] = v[1] * n
}

/** Divide a vector by a scalar. */
export function vecDivBy(v, n, out)
{
	if(!out)
		out = v
	out[0] = v[0] / n
	out[1] = v[1] / n
}

/** Vector dot-product. */
export function vecDot(v1, v2)
{
	return v1[0] * v2[0] + v1[1] * v2[1]
}

/** Vector magnitude. */
export function vecMag(v)
{
	return Math.sqrt(v[0] * v[0] + v[1] * v[1])
}

/** Normalize a vector. */
export function vecNormalize(v, out)
{
	if(!out)
		out = v
	const mag = this.vecMag(v)
	out[0] = v[0] / mag
	out[1] = v[1] / mag
}


// (3x3) matrix math routines

/** Create a 3x3 Identity matrix. */
export function matCreateIdentity()
{
	const m = new Float64Array(9)

	m[0] = 1
	m[1] = 0
	m[2] = 0
	m[3] = 0
	m[4] = 1
	m[5] = 0
	m[6] = 0
	m[7] = 0
	m[8] = 1

	return m
}

/** Set a 3x3 matrix to identity. */
export function matSetIdentity(m)
{
	m[0] = 1
	m[1] = 0
	m[2] = 0
	m[3] = 0
	m[4] = 1
	m[5] = 0
	m[6] = 0
	m[7] = 0
	m[8] = 1

	return m
}

/** Set a 3x3 matrix's translation. */
export function matSetTranslation(m, dx, dy)
{
	m[2] = dx
	m[5] = dy
	return m
}

/** Set a 3x3 matrix's scale (WARNING: disregards current rotation & scale. */
export function matSetScale(m, sx, sy)
{
	m[0] = sx
	m[4] = sy
	return m
}

/** Set a 3x3 matrix's rotation (WARNING: disregards current rotation & scale. */
export function matSetRotation(m, theta)
{
	const c = Math.cos(theta)
	const s = Math.sin(theta)
	m[0] = c
	m[1] = s
	m[3] = -s
	m[4] = c
	return m
}

/** Set a 3x3 matrix's rotation and scale (WARNING: disregards current rotation & scale. */
export function matSetRotationAndScale(m, theta, sx, sy)
{
	const c = Math.cos(theta)
	const s = Math.sin(theta)
	m[0] = c * sx
	m[1] = -s * sy
	m[3] = s * sx
	m[4] = c * sy
	return m
}

/** Translate a matrix. */
export function matTranslate(m, dx, dy, out)
{
	if(!out)
		out = m
	const t = this.matCreateIdentity()
	this.matSetTranslation(t, dx, dy)
	this.matMul(m, t, out)
	return out
}

/** Scale a matrix. */
export function matScale(m, sx, sy, out)
{
	if(!out)
		out = m
	const s = this.matCreateIdentity()
	this.matSetScale(s, sx, sy)
	this.matMul(m, s, out)
	return out
}

/** Rotate a matrix. */
export function matRotate(m, theta, out)
{
	if(!out)
		out = m
	const r = this.matCreateIdentity()
	this.matSetRotation(r, theta)
	this.matMul(m, r, out)
	return out
}

/** Matrix multiplication. */
export function matMul(m1, m2, out)
{
	if(!out)
		out = m1

	// cache values
	const a00 = m1[0], a01 = m1[1], a02 = m1[2],
		a10 = m1[3], a11 = m1[4], a12 = m1[5],
		a20 = m1[6], a21 = m1[7], a22 = m1[8],

		b00 = m2[0], b01 = m2[1], b02 = m2[2],
		b10 = m2[3], b11 = m2[4], b12 = m2[5],
		b20 = m2[6], b21 = m2[7], b22 = m2[8]

	out[0] = b00 * a00 + b01 * a10 + b02 * a20
	out[1] = b00 * a01 + b01 * a11 + b02 * a21
	out[2] = b00 * a02 + b01 * a12 + b02 * a22

	out[3] = b10 * a00 + b11 * a10 + b12 * a20
	out[4] = b10 * a01 + b11 * a11 + b12 * a21
	out[5] = b10 * a02 + b11 * a12 + b12 * a22

	out[6] = b20 * a00 + b21 * a10 + b22 * a20
	out[7] = b20 * a01 + b21 * a11 + b22 * a21
	out[8] = b20 * a02 + b21 * a12 + b22 * a22

	return out
}

/** Clone a matrix. */
export function matClone(m)
{
	const m1 = new Float64Array(9)

//		m1[0] = m[0]
//		m1[1] = m[1]
//		m1[2] = m[2]
//		m1[3] = m[3]
//		m1[4] = m[4]
//		m1[5] = m[5]
//		m1[6] = m[6]
//		m1[7] = m[7]
//		m1[8] = m[8]

	m1.set(m)
	return m1
}

/** Transpose a matrix (i.e. from row-col to col-row or vice-versa). */
export function matTranspose(m, out)
{
	// If we are transposing ourselves we can skip a few steps but have to cache some values
	if(!out || m === out) {
		const a01 = m[1], a02 = m[2], a12 = m[5]

		m[1] = m[3]
		m[2] = m[6]
		m[3] = a01
		m[5] = m[7]
		m[6] = a02
		m[7] = a12
		return m
	}
	else {
		out[0] = m[0]
		out[1] = m[3]
		out[2] = m[6]
		out[3] = m[1]
		out[4] = m[4]
		out[5] = m[7]
		out[6] = m[2]
		out[7] = m[5]
		out[8] = m[8]
		return out
	}
}

