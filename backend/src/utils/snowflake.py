# Source: https://github.com/cablehead/python-snowflake

import asyncio
import time
from typing import Any, AsyncGenerator

from src.config import config

# January 1, 2024 00:00:00 GMT
epoch = 1704067200000

worker_id_bits = 5
data_center_id_bits = 5
sequence_bits = 12
sequence_mask = -1 ^ (-1 << sequence_bits)


def snowflake_to_timestamp(_id):
    _id = _id >> 22  # strip the lower 22 bits
    _id += epoch  # adjust for epoch
    _id = _id / 1000  # convert from milliseconds to seconds
    return _id


async def snowflake_generator() -> AsyncGenerator[int, Any]:
    last_timestamp = -1
    sequence = 0

    while True:
        timestamp = int(time.time() * 1000)

        if last_timestamp > timestamp:
            # log.warning("clock is moving backwards. waiting until %i" % last_timestamp)
            await asyncio.sleep((last_timestamp - timestamp) / 1000.0)
            continue

        if last_timestamp == timestamp:
            sequence = (sequence + 1) & sequence_mask
            if sequence == 0:
                # log.warning("sequence overrun")
                sequence = -1 & sequence_mask
                await asyncio.sleep(1 / 1000.0)
                continue
        else:
            sequence = 0

        last_timestamp = timestamp

        worker_id_shift = sequence_bits
        data_center_id_shift = sequence_bits + worker_id_bits
        timestamp_left_shift = sequence_bits + worker_id_bits + data_center_id_bits

        yield (
            ((timestamp - epoch) << timestamp_left_shift)
            | (config.data_center_id << data_center_id_shift)
            | (config.worker_id << worker_id_shift)
            | sequence
        )


gen = snowflake_generator()


async def generate_new_id() -> int:
    return await gen.__anext__()
