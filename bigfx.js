const BigFX = (function () {
  const DIGITS = 18,
    SCALE = Math.pow(10, DIGITS),
    SCALE_BI = BigInt(SCALE),
    POWER_CUTOFF = 2000n;

  class BigFX {
    constructor(val) {
      if (typeof val === "undefined") {
        this._bigint = 0n;
      } else if (typeof val === "number") {
        this._fromNumber(val);
      } else if (typeof val === "bigint") {
        this._fromBigInt(val);
      } else if (val instanceof BigFX) {
        this._fromBigFX(val);
      }
    }

    _fromInternal(val) {
      this._bigint = val;
      return this;
    }

    _fromNumber(val) {
      this._bigint = BigInt(Math.round(val * SCALE));
    }

    _fromBigInt(val) {
      this._bigint = val * SCALE_BI;
    }

    _fromBigFX(val) {
      this._bigint = val._bigint;
    }

    clone() {
      return new BigFX()._fromInternal(this._bigint);
    }

    neg() {
      return new BigFX()._fromInternal(-this._bigint);
    }

    add(other) {
      other = new BigFX(other);
      return new BigFX()._fromInternal(this._bigint + other._bigint);
    }

    sub(other) {
      other = new BigFX(other);
      return new BigFX()._fromInternal(this._bigint - other._bigint);
    }

    mul(other) {
      other = new BigFX(other);
      return new BigFX()._fromInternal(
        (this._bigint * other._bigint) / SCALE_BI
      );
    }

    div(other) {
      other = new BigFX(other);
      return new BigFX()._fromInternal(
        (this._bigint * SCALE_BI) / other._bigint
      );
    }

    mod(other) {
      other = new BigFX(other);
      return new BigFX()._fromInternal(this._bigint % other._bigint);
    }

    and(other) {
      other = new BigFX(other);
      return new BigFX((this._bigint / SCALE_BI) & (other._bigint / SCALE_BI));
    }

    or(other) {
      other = new BigFX(other);
      return new BigFX((this._bigint / SCALE_BI) | (other._bigint / SCALE_BI));
    }

    xor(other) {
      other = new BigFX(other);
      return new BigFX((this._bigint / SCALE_BI) ^ (other._bigint / SCALE_BI));
    }

    shl(other) {
      other = new BigFX(other);
      return new BigFX()._fromInternal(
        this._bigint << (other._bigint / SCALE_BI)
      );
    }

    shr(other) {
      other = new BigFX(other);
      return new BigFX()._fromInternal(
        this._bigint >> (other._bigint / SCALE_BI)
      );
    }

    exp() {
      if (this._bigint < SCALE_BI) {
        return new BigFX(Math.exp(Number(this._bigint) / SCALE));
      } else {
        const temp = this.shr(1).exp();
        return temp.mul(temp);
      }
    }

    log() {
      if (this._bigint < SCALE_BI) {
        return new BigFX(Math.log(Number(this._bigint) / SCALE));
      } else {
        return this.div(Math.E).log().add(1);
      }
    }

    pow(other) {
      other = new BigFX(other);
      if (other._bigint < SCALE_BI) {
        return new BigFX(
          Math.pow(Number(this._bigint) / SCALE, Number(other._bigint) / SCALE)
        );
      } else if (other._bigint > SCALE_BI * POWER_CUTOFF) {
        // For high powers, switch to BigInt's exponentiation,
        // because stack overflow could happen otherwise

        var t = other._bigint / SCALE_BI;

        return new BigFX()._fromInternal(
          this._bigint ** t / SCALE_BI ** (t - 1n)
        );
      } else {
        return this.pow(other.sub(1)).mul(this);
      }
    }

    sqrt() {
      return this.pow(0.5);
    }

    sin() {
      return new BigFX(Math.sin(this.mod(2 * Math.PI).toNumber()));
    }

    cos() {
      return new BigFX(Math.cos(this.mod(2 * Math.PI).toNumber()));
    }

    tan() {
      return new BigFX(Math.tan(this.mod(Math.PI).toNumber()));
    }

    lt(other) {
      other = new BigFX(other);
      return this._bigint < other._bigint;
    }

    le(other) {
      other = new BigFX(other);
      return this._bigint <= other._bigint;
    }

    gt(other) {
      other = new BigFX(other);
      return this._bigint > other._bigint;
    }

    ge(other) {
      other = new BigFX(other);
      return this._bigint >= other._bigint;
    }

    eq(other) {
      other = new BigFX(other);
      return this._bigint == other._bigint;
    }

    ne(other) {
      other = new BigFX(other);
      return this._bigint != other._bigint;
    }

    toNumber() {
      return Number(this._bigint) / SCALE;
    }

    toBigInt() {
      return this._bigint / SCALE_BI;
    }

    toScaledBigInt() {
      return this._bigint;
    }

    toString(radix = 10) {
      if (this._bigint === 0n) {
        return "0";
      }

      if (this._bigint < 0n) {
        return "-" + this.neg().toString(radix);
      }

      const fracPart = (Number(this._bigint % SCALE_BI) / SCALE)
        .toString(radix)
        .slice(2);

      return (
        (this._bigint / SCALE_BI).toString(radix) +
        (fracPart ? "." + fracPart : "")
      );
    }

    toFixed(fractionDigits = 0) {
      if (this._bigint === 0n) {
        return (0).toFixed(fractionDigits);
      }

      if (this._bigint < 0n) {
        return "-" + this.neg().toFixed(fractionDigits);
      }

      const fracPart = (Number(this._bigint % SCALE_BI) / SCALE)
        .toFixed(fractionDigits)
        .slice(2);

      return (
        (this._bigint / SCALE_BI).toString() + (fracPart ? "." + fracPart : "")
      );
    }

    toExponential() {
      if (this._bigint === 0n) {
        return "0e0";
      }

      if (this._bigint < 0n) {
        return "-" + this.neg().toExponential();
      }

      var mantissa = this.clone();
      var exponent = 0;

      while (mantissa._bigint > SCALE_BI) {
        mantissa = mantissa.div(10);
        exponent++;
      }

      while (mantissa._bigint < SCALE_BI) {
        mantissa = mantissa.mul(10);
        exponent--;
      }

      return mantissa.toString() + "e" + exponent;
    }

    static random() {
      return new BigFX(Math.random());
    }
  }

  BigFX.ZERO = new BigFX(0);
  BigFX.ONE = new BigFX(1);
  BigFX.TEN = new BigFX(10);
  BigFX.PI = new BigFX(Math.PI);
  BigFX.E = new BigFX(Math.E);

  return BigFX;
})();

if (typeof module === "object" && module.exports) {
  module.exports = BigFX;
}
