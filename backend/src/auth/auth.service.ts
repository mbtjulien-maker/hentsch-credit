import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { User } from '@prisma/client';
import { verifyPassword } from '../common/password.util';
import { PrismaService } from '../prisma/prisma.service';

// Contenu du JWT de session — volontairement minimal (id + rôle). Le rôle est figé au
// moment du login : un changement de rôle en base ne prend effet qu'à la prochaine
// connexion (compromis standard JWT, cf. AuthController.me qui relit la base pour
// l'écran de profil si une fraîcheur immédiate est nécessaire).
export interface JwtPayload {
  sub: string;
  role: User['role'];
}

export interface AuthenticatedUser {
  id: string;
  role: User['role'];
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  // Retourne l'utilisateur si email + mot de passe correspondent, sinon null — jamais
  // d'exception ici (le contrôleur décide du message générique à renvoyer, pour ne pas
  // laisser deviner si c'est l'email ou le mot de passe qui est erroné).
  async validateCredentials(
    email: string,
    password: string,
  ): Promise<User | null> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      return null;
    }
    const valid = await verifyPassword(password, user.passwordHash);
    return valid ? user : null;
  }

  async signToken(user: Pick<User, 'id' | 'role'>): Promise<string> {
    const payload: JwtPayload = { sub: user.id, role: user.role };
    return this.jwtService.signAsync(payload);
  }
}
