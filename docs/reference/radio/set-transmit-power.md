# Set Transmit Power

Make the ``radio`` signal of the micro:bit stronger or weaker.
It can be as weak as `0` and as strong as `7`.

The scientific name for the strength of the ``radio`` signal is
**dBm**, or **decibel-milliwatts**. A signal strength of `0`
can be measured as -30 dBm, and a strength of `7` can be
measured as +4 dBm.

```sig
radio.setTransmitPower(7);
```

### Range
   
If your micro:bit is sending with a strength of `7`, and you are in
an open area without many other computers around, the micro:bit signal
can reach as far as 70 meters (about 230 feet).

### Parameters

* ``power`` is a [number](/reference/types/number) between ``0`` and ``7`` that
means how strong the signal is.

### Simulator

This function only works on the micro:bit, not in browsers.

### Example

This program makes the ``radio`` send at full strength.

```blocks
radio.setTransmitPower(7)
```

### See also

[receive number](/reference/radio/receive-number), [send number](/reference/radio/send-number), [on data received](/reference/radio/on-data-received)

```package
microbit-radio
```