"""Promote a verified profile using operator-held database credentials."""

import argparse
import logging
from uuid import UUID

from sqlalchemy.orm import Session

from app.db.session import get_engine
from app.modules.identity.service import provision_instructor

logger = logging.getLogger(__name__)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--subject", type=UUID, required=True, help="Supabase auth subject UUID")
    parser.add_argument(
        "--operator", required=True, help="Operator identity for the deployment log"
    )
    parser.add_argument("--reason", required=True, help="Reason for the role grant")
    parser.add_argument("--apply", action="store_true", help="Actually write the role grant")
    args = parser.parse_args()
    if not args.apply:
        parser.error("Pass --apply to perform the role grant")
    if not args.operator.strip() or not args.reason.strip():
        parser.error("Operator and reason must not be blank")
    with Session(get_engine(), expire_on_commit=False) as session:
        try:
            changed = provision_instructor(session, args.subject)
        except LookupError as error:
            parser.exit(1, f"{error}\n")
    logger.warning(
        "instructor_provision subject=%s operator=%s reason=%s changed=%s",
        args.subject,
        args.operator,
        args.reason,
        changed,
    )
    print("Instructor role granted" if changed else "Already an instructor")
    return 0


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    raise SystemExit(main())
